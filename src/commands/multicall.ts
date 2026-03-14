import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import { isAddress } from 'viem';
import { getPublicClient, getCurrentChain } from '../core/blockchain/chains.js';

// ── Multicall3 ────────────────────────────────────────────────────────────────

const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11' as const;

const MULTICALL3_ABI = [
  {
    name: 'aggregate3',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [{
      name: 'calls', type: 'tuple[]',
      components: [
        { name: 'target',       type: 'address' },
        { name: 'allowFailure', type: 'bool' },
        { name: 'callData',     type: 'bytes' },
      ],
    }],
    outputs: [{
      name: 'returnData', type: 'tuple[]',
      components: [
        { name: 'success',    type: 'bool' },
        { name: 'returnData', type: 'bytes' },
      ],
    }],
  },
] as const;

// ── JSON call file schema ─────────────────────────────────────────────────────
// [{ "contract": "0x...", "function": "balanceOf(address)", "args": ["0x..."] }]

interface CallDef {
  contract:  string;
  function:  string;
  args?:     (string | number | boolean)[];
  label?:    string;
}

// ── ABI encode function call ──────────────────────────────────────────────────

function parseFunctionSig(sig: string): { name: string; inputTypes: string[] } {
  const m = sig.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)$/);
  if (!m) throw new Error(`Invalid function signature: "${sig}"`);
  const name       = m[1];
  const inputTypes = m[2].trim() === '' ? [] : m[2].split(',').map(t => t.trim());
  return { name, inputTypes };
}

function encodeSelector(sig: string): string {
  const { createHash } = require('crypto');
  const hash = createHash('sha3-256');
  // Use viem's keccak instead
  const { keccak256, toBytes, toHex } = require('viem');
  return keccak256(toHex(toBytes(sig))).slice(0, 10);
}

function encodeArg(value: string | number | boolean, type: string): string {
  if (type === 'bool') {
    return (value ? 1 : 0).toString(16).padStart(64, '0');
  }
  if (type === 'address') {
    const addr = String(value).replace('0x', '').toLowerCase();
    return addr.padStart(64, '0');
  }
  if (type.startsWith('uint') || type.startsWith('int')) {
    const n = BigInt(value as string | number);
    return n.toString(16).padStart(64, '0');
  }
  if (type === 'bytes32') {
    return String(value).replace('0x', '').padEnd(64, '0');
  }
  // string / bytes — dynamic type, simplified encode
  const hex = Buffer.from(String(value)).toString('hex');
  const len  = hex.length / 2;
  return (
    '0000000000000000000000000000000000000000000000000000000000000020' + // offset
    len.toString(16).padStart(64, '0') +
    hex.padEnd(Math.ceil(hex.length / 64) * 64, '0')
  );
}

function encodeCall(fnSig: string, args: (string | number | boolean)[] = []): `0x${string}` {
  const { name, inputTypes } = parseFunctionSig(fnSig);
  const selector = encodeSelector(fnSig);

  if (inputTypes.length === 0) return selector as `0x${string}`;

  const encoded = inputTypes.map((t, i) => encodeArg(args[i] ?? '0', t)).join('');
  return (selector + encoded) as `0x${string}`;
}

// ── Decode simple return ──────────────────────────────────────────────────────

function decodeReturn(data: `0x${string}`, fnSig: string): string {
  if (!data || data === '0x') return '0x (empty)';
  const hex = data.slice(2);

  // Detect common patterns
  if (hex.length === 64) {
    // Address?
    if (hex.startsWith('000000000000000000000000')) {
      return '0x' + hex.slice(24);
    }
    // uint256
    try {
      const val = BigInt('0x' + hex);
      if (val === 0n) return '0';
      const asEther = Number(val) / 1e18;
      return `${val.toLocaleString()}${asEther > 0.0001 && asEther < 1e12 ? ` (~${asEther.toFixed(4)} if 18 dec)` : ''}`;
    } catch {}
  }

  // bool
  if (hex.endsWith('0000000000000000000000000000000000000000000000000000000000000001')) return 'true';
  if (hex.endsWith('0000000000000000000000000000000000000000000000000000000000000000')) return 'false';

  // string — attempt UTF-8 decode
  try {
    if (hex.length > 128) {
      const lenHex  = hex.slice(64, 128);
      const strLen  = parseInt(lenHex, 16);
      if (strLen > 0 && strLen < 200) {
        const strHex = hex.slice(128, 128 + strLen * 2);
        const str    = Buffer.from(strHex, 'hex').toString('utf8');
        if (/^[\x20-\x7E]+$/.test(str)) return `"${str}"`;
      }
    }
  } catch {}

  return data.slice(0, 66) + (data.length > 66 ? '...' : '');
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function multicallCommand(args: string[]): Promise<void> {
  const jsonMode = args.includes('--json');

  if (args.length === 0 || args[0] === '--help') {
    console.log(chalk.bold.cyan('\n  aura multicall <file.json | inline>\n'));
    console.log(chalk.gray('  Batch read-only contract calls in a single RPC request.\n'));
    console.log(chalk.gray('  From JSON file:'));
    console.log(chalk.gray('    aura multicall calls.json'));
    console.log(chalk.gray('    aura multicall calls.json --json\n'));
    console.log(chalk.gray('  Inline (contract function arg):'));
    console.log(chalk.gray('    aura multicall 0xA0b8... "totalSupply()" --'));
    console.log(chalk.gray('    aura multicall 0xA0b8... "balanceOf(address)" 0x1234...\n'));
    console.log(chalk.gray('  JSON file format:'));
    console.log(chalk.gray('  ['));
    console.log(chalk.gray('    { "contract": "0x...", "function": "totalSupply()", "label": "USDC supply" },'));
    console.log(chalk.gray('    { "contract": "0x...", "function": "balanceOf(address)", "args": ["0x..."] }'));
    console.log(chalk.gray('  ]\n'));
    return;
  }

  let calls: CallDef[] = [];

  // ── Load from file or inline ──────────────────────────────────────────────
  if (args[0].endsWith('.json')) {
    const filePath = args[0];
    if (!fs.existsSync(filePath)) {
      console.error(chalk.red(`\n  File not found: ${filePath}\n`));
      return;
    }
    try {
      calls = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      console.error(chalk.red('\n  Invalid JSON file\n'));
      return;
    }
  } else if (isAddress(args[0]) && args[1]) {
    // Inline: aura multicall <contract> <fnSig> [arg1 arg2 ...]
    const fnArgs = args.slice(2).filter(a => a !== '--json');
    calls = [{ contract: args[0], function: args[1], args: fnArgs }];
  } else {
    console.error(chalk.red('\n  Provide a .json file or: <contract> <function> [args...]\n'));
    return;
  }

  if (calls.length === 0) { console.error(chalk.red('\n  No calls defined\n')); return; }

  // Validate
  for (const c of calls) {
    if (!isAddress(c.contract)) {
      console.error(chalk.red(`\n  Invalid contract address: "${c.contract}"\n`));
      return;
    }
  }

  const chain  = getCurrentChain();
  const client = getPublicClient();
  const spinner = ora(chalk.cyan(` Executing ${calls.length} call(s) via Multicall3...`)).start();

  try {
    // Check multicall3 exists on chain
    const code = await client.getCode({ address: MULTICALL3_ADDRESS });
    if (!code || code === '0x') {
      spinner.stop();
      console.error(chalk.red('\n  Multicall3 not deployed on this chain. Try individual calls with "aura call".\n'));
      return;
    }

    // Encode all calls
    const encodedCalls = calls.map(c => ({
      target:       c.contract as `0x${string}`,
      allowFailure: true,
      callData:     encodeCall(c.function, c.args ?? []),
    }));

    const results = await client.readContract({
      address:      MULTICALL3_ADDRESS,
      abi:          MULTICALL3_ABI,
      functionName: 'aggregate3',
      args:         [encodedCalls],
    }) as { success: boolean; returnData: `0x${string}` }[];

    spinner.stop();

    if (jsonMode) {
      const out = calls.map((c, i) => ({
        label:    c.label ?? `${c.contract.slice(0, 10)}...${c.function}`,
        contract: c.contract,
        function: c.function,
        args:     c.args ?? [],
        success:  results[i]?.success,
        raw:      results[i]?.returnData,
        decoded:  results[i]?.success ? decodeReturn(results[i].returnData, c.function) : null,
      }));
      console.log(JSON.stringify(out, null, 2));
      return;
    }

    const divider = chalk.gray('─'.repeat(62));
    const successCount = results.filter(r => r.success).length;

    console.log(chalk.bold.cyan(`\n  Multicall3 Results  [${chain.name}]`));
    console.log(chalk.gray(`  ${calls.length} call(s)  —  ${successCount} succeeded, ${calls.length - successCount} failed`));
    console.log(divider);

    for (let i = 0; i < calls.length; i++) {
      const c      = calls[i];
      const result = results[i];
      const label  = c.label ?? `${c.contract.slice(0, 10)}...  ${c.function.split('(')[0]}`;

      if (!result?.success) {
        console.log(`  ${chalk.red('✗')} ${chalk.gray(label)}`);
        console.log(`     ${chalk.red('reverted')}`);
      } else {
        const decoded = decodeReturn(result.returnData, c.function);
        console.log(`  ${chalk.green('✓')} ${chalk.cyan(label)}`);
        console.log(`     ${chalk.white(decoded)}`);
      }
    }

    console.log(divider);
    console.log('');

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`\n  Error: ${error instanceof Error ? error.message.slice(0, 150) : String(error)}\n`));
  }
}