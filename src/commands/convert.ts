import chalk from 'chalk';
import { keccak256, stringToHex, formatEther, formatUnits, parseEther, parseUnits } from 'viem';

// ── Types ─────────────────────────────────────────────────────────────────────

type Unit = 'wei' | 'gwei' | 'eth' | 'hex' | 'decimal' | 'keccak' | 'selector' | 'bytes32' | 'address';

const UNIT_ALIASES: Record<string, Unit> = {
  wei: 'wei', gwei: 'gwei', eth: 'eth', ether: 'eth',
  hex: 'hex', '0x': 'hex',
  dec: 'decimal', decimal: 'decimal', int: 'decimal',
  keccak: 'keccak', keccak256: 'keccak', hash: 'keccak',
  selector: 'selector', sel: 'selector', sig: 'selector',
  bytes32: 'bytes32',
  address: 'address', addr: 'address',
};

// ── Formatters ────────────────────────────────────────────────────────────────

function formatBigInt(n: bigint): string {
  return n.toLocaleString('en-US').replace(/,/g, '_');
}

function toHex(n: bigint): string {
  return `0x${n.toString(16)}`;
}

function fromHex(h: string): bigint {
  const clean = h.startsWith('0x') || h.startsWith('0X') ? h : `0x${h}`;
  return BigInt(clean);
}

// ── Conversion logic ──────────────────────────────────────────────────────────

interface ConvertResult {
  label:  string;
  output: string;
  extra?: string[];
}

function convertValue(raw: string, from: Unit, to?: Unit): ConvertResult[] {
  const results: ConvertResult[] = [];

  // ── keccak256 ──────────────────────────────────────────────────────────────
  if (from === 'keccak') {
    const hash = keccak256(stringToHex(raw));
    results.push({ label: 'keccak256', output: hash });
    results.push({ label: '4-byte selector', output: hash.slice(0, 10) });
    return results;
  }

  // ── function selector ──────────────────────────────────────────────────────
  if (from === 'selector') {
    // Normalize: ensure it looks like a function sig
    const sig = raw.includes('(') ? raw : `${raw}()`;
    const hash = keccak256(stringToHex(sig));
    results.push({ label: 'Function', output: sig });
    results.push({ label: 'Selector (4-byte)', output: hash.slice(0, 10) });
    results.push({ label: 'Full keccak256', output: hash });
    return results;
  }

  // ── hex ↔ decimal ──────────────────────────────────────────────────────────
  if (from === 'hex') {
    try {
      const n = fromHex(raw);
      results.push({ label: 'Decimal', output: formatBigInt(n) });
      // Try treating as wei
      try {
        results.push({ label: 'As ETH (if wei)', output: `${formatEther(n)} ETH` });
        results.push({ label: 'As Gwei (if wei)', output: `${formatUnits(n, 9)} Gwei` });
      } catch {}
      return results;
    } catch {
      results.push({ label: 'Error', output: 'Invalid hex value' });
      return results;
    }
  }

  if (from === 'decimal') {
    try {
      const n = BigInt(raw.replace(/_/g, '').replace(/,/g, ''));
      results.push({ label: 'Hex', output: toHex(n) });
      try {
        results.push({ label: 'As ETH (if wei)', output: `${formatEther(n)} ETH` });
        results.push({ label: 'As Gwei (if wei)', output: `${formatUnits(n, 9)} Gwei` });
      } catch {}
      return results;
    } catch {
      results.push({ label: 'Error', output: 'Invalid decimal value' });
      return results;
    }
  }

  // ── address checksum ───────────────────────────────────────────────────────
  if (from === 'address') {
    if (!raw.match(/^0x[0-9a-fA-F]{40}$/)) {
      results.push({ label: 'Error', output: 'Invalid Ethereum address' });
      return results;
    }
    // EIP-55 checksum via viem
    const { getAddress } = require('viem');
    try {
      results.push({ label: 'Checksummed', output: getAddress(raw) });
      results.push({ label: 'Lowercase', output: raw.toLowerCase() });
      results.push({ label: 'Padded (bytes32)', output: `0x${raw.slice(2).toLowerCase().padStart(64, '0')}` });
    } catch {
      results.push({ label: 'Error', output: 'Invalid address' });
    }
    return results;
  }

  // ── bytes32 → address ──────────────────────────────────────────────────────
  if (from === 'bytes32') {
    if (raw.length !== 66 && raw.length !== 64) {
      results.push({ label: 'Error', output: 'bytes32 must be 32 bytes (64 hex chars)' });
      return results;
    }
    const clean = raw.startsWith('0x') ? raw.slice(2) : raw;
    const addr  = `0x${clean.slice(-40)}`;
    results.push({ label: 'Address', output: addr });
    results.push({ label: 'As bigint', output: formatBigInt(BigInt(`0x${clean}`)) });
    return results;
  }

  // ── ETH unit conversions ───────────────────────────────────────────────────
  try {
    let wei: bigint;

    if (from === 'wei') {
      wei = BigInt(raw.replace(/_/g, '').replace(/,/g, ''));
    } else if (from === 'gwei') {
      wei = parseUnits(raw, 9);
    } else if (from === 'eth') {
      wei = parseEther(raw);
    } else {
      results.push({ label: 'Error', output: `Unknown unit: ${from}` });
      return results;
    }

    // If specific target requested
    if (to) {
      if (to === 'wei')  results.push({ label: 'Wei',  output: formatBigInt(wei) });
      if (to === 'gwei') results.push({ label: 'Gwei', output: formatUnits(wei, 9) });
      if (to === 'eth')  results.push({ label: 'ETH',  output: formatEther(wei) });
      if (to === 'hex')  results.push({ label: 'Hex',  output: toHex(wei) });
      return results;
    }

    // Default: show all ETH units
    results.push({ label: 'Wei',  output: formatBigInt(wei) });
    results.push({ label: 'Gwei', output: formatUnits(wei, 9) });
    results.push({ label: 'ETH',  output: formatEther(wei) });
    results.push({ label: 'Hex',  output: toHex(wei) });

  } catch (e) {
    results.push({ label: 'Error', output: e instanceof Error ? e.message : 'Conversion failed' });
  }

  return results;
}

// ── Display ───────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(chalk.bold.cyan('\n  aura convert <value> <from> [to]\n'));
  console.log(chalk.white('  Units:'));
  console.log(chalk.gray('    wei, gwei, eth             — Ethereum denominations'));
  console.log(chalk.gray('    hex, decimal               — Number base conversion'));
  console.log(chalk.gray('    keccak <string>            — keccak256 hash'));
  console.log(chalk.gray('    selector <sig>             — 4-byte function selector'));
  console.log(chalk.gray('    address <addr>             — EIP-55 checksum + padding'));
  console.log(chalk.gray('    bytes32 <value>            — Extract address from storage slot'));
  console.log(chalk.white('\n  Examples:'));
  console.log(chalk.gray('    aura convert 1 eth'));
  console.log(chalk.gray('    aura convert 1000000000 wei gwei'));
  console.log(chalk.gray('    aura convert 0xff hex'));
  console.log(chalk.gray('    aura convert 255 decimal'));
  console.log(chalk.gray('    aura convert "transfer(address,uint256)" selector'));
  console.log(chalk.gray('    aura convert "Ownable" keccak'));
  console.log(chalk.gray('    aura convert 0xAbCd...1234 address\n'));
}

// ── Command entry point ───────────────────────────────────────────────────────

export async function convertCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    return;
  }

  // aura convert <value> <from> [to]
  // Special case: keccak/selector can have spaces in value → join everything except last token(s)
  let value: string;
  let fromRaw: string;
  let toRaw: string | undefined;

  if (args.length === 1) {
    // Auto-detect: single arg
    const a = args[0];
    if (a.startsWith('0x') && a.length === 42) {
      fromRaw = 'address'; value = a;
    } else if (a.startsWith('0x') && a.length === 66) {
      fromRaw = 'bytes32'; value = a;
    } else if (a.startsWith('0x')) {
      fromRaw = 'hex'; value = a;
    } else if (/^\d+$/.test(a)) {
      fromRaw = 'decimal'; value = a;
    } else {
      printHelp(); return;
    }
  } else {
    fromRaw = args[args.length - 1].toLowerCase();
    toRaw   = undefined;

    // Check if last two args are both units (convert X from to)
    const secondLast = args[args.length - 2]?.toLowerCase();
    if (secondLast && UNIT_ALIASES[secondLast] && UNIT_ALIASES[fromRaw]) {
      toRaw   = fromRaw;
      fromRaw = secondLast;
      value   = args.slice(0, -2).join(' ');
    } else {
      value = args.slice(0, -1).join(' ');
    }
  }

  const from = UNIT_ALIASES[fromRaw];
  const to   = toRaw ? UNIT_ALIASES[toRaw] : undefined;

  if (!from) {
    console.log(chalk.red(`\n  Unknown unit: "${fromRaw}"`));
    printHelp();
    return;
  }

  const results = convertValue(value, from, to);

  console.log(chalk.bold.cyan(`\n  Converting: ${chalk.white(value)} ${chalk.gray(`[${fromRaw}]`)}${to ? chalk.gray(` → [${toRaw}]`) : ''}\n`));

  const labelWidth = Math.max(...results.map(r => r.label.length)) + 2;

  for (const r of results) {
    const label  = chalk.gray(r.label.padEnd(labelWidth));
    const isError = r.label === 'Error';
    const output = isError ? chalk.red(r.output) : chalk.green(r.output);
    console.log(`  ${label} ${output}`);
  }

  console.log('');
}