import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import { isAddress } from 'viem';
import { lookupSelector } from '../core/engine/selector-db.js';
import { getPublicClient } from '../core/blockchain/chains.js';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AbiItem {
  name?:            string;
  type:             string;
  stateMutability?: string;
  inputs?:          { name: string; type: string }[];
  outputs?:         { name: string; type: string }[];
  anonymous?:       boolean;
}

// ── Etherscan fetch ───────────────────────────────────────────────────────────

async function fetchFromEtherscan(address: string): Promise<AbiItem[] | null> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  const base   = process.env.ETHERSCAN_API_URL ?? 'https://api.etherscan.io/api';

  if (!apiKey) return null;

  try {
    const res = await axios.get(base, {
      params: { module: 'contract', action: 'getabi', address, apikey: apiKey },
      timeout: 8000,
    });

    if (res.data.status === '1' && res.data.result) {
      return JSON.parse(res.data.result) as AbiItem[];
    }
  } catch {}

  return null;
}

// ── Bytecode selector fallback ────────────────────────────────────────────────

function extractSelectorsFromBytecode(bytecode: string): string[] {
  const runtime = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;
  const regex   = /63([0-9a-f]{8})/g;
  const found   = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(runtime.toLowerCase())) !== null) {
    found.add(`0x${match[1]}`);
  }
  return Array.from(found);
}

// ── Display helpers ───────────────────────────────────────────────────────────

function formatInputs(inputs?: { name: string; type: string }[]): string {
  if (!inputs || inputs.length === 0) return '()';
  return `(${inputs.map(i => `${i.type}${i.name ? ' ' + i.name : ''}`).join(', ')})`;
}

function formatOutputs(outputs?: { name: string; type: string }[]): string {
  if (!outputs || outputs.length === 0) return '';
  return ` → (${outputs.map(o => o.type).join(', ')})`;
}

function mutabilityLabel(sm?: string): string {
  if (!sm || sm === 'nonpayable') return '';
  const colors: Record<string, (s: string) => string> = {
    view:     chalk.cyan,
    pure:     chalk.blue,
    payable:  chalk.yellow,
  };
  return ` [${(colors[sm] ?? chalk.gray)(sm)}]`;
}

function displayAbi(abi: AbiItem[], filter?: string): void {
  const functions = abi.filter(i => i.type === 'function');
  const events    = abi.filter(i => i.type === 'event');
  const errors    = abi.filter(i => i.type === 'error');

  const filtered = filter
    ? functions.filter(i => i.name?.toLowerCase().includes(filter.toLowerCase()))
    : functions;

  if (functions.length > 0) {
    console.log(chalk.bold.white(`\n  Functions (${filter ? `${filtered.length}/${functions.length}` : functions.length}):`));
    const divider = chalk.gray('  ' + '─'.repeat(60));
    console.log(divider);

    for (const fn of filtered) {
      const sig = `${fn.name}${formatInputs(fn.inputs)}`;
      console.log(
        `  ${chalk.cyan(fn.name ?? '?').padEnd(30)}` +
        chalk.gray(formatInputs(fn.inputs)) +
        chalk.gray(formatOutputs(fn.outputs)) +
        mutabilityLabel(fn.stateMutability)
      );
    }
  }

  if (!filter && events.length > 0) {
    console.log(chalk.bold.white(`\n  Events (${events.length}):`));
    for (const ev of events) {
      const topics = ev.inputs?.filter(i => (i as any).indexed).map(i => i.type).join(', ') ?? '';
      console.log(`  ${chalk.magenta(ev.name ?? '?').padEnd(30)} ${chalk.gray(formatInputs(ev.inputs))}`);
    }
  }

  if (!filter && errors.length > 0) {
    console.log(chalk.bold.white(`\n  Custom Errors (${errors.length}):`));
    for (const err of errors) {
      console.log(`  ${chalk.red(err.name ?? '?').padEnd(30)} ${chalk.gray(formatInputs(err.inputs))}`);
    }
  }
}

function displaySelectors(selectors: string[]): void {
  console.log(chalk.bold.white(`\n  Detected Selectors (${selectors.length}) — from bytecode:\n`));
  const divider = chalk.gray('  ' + '─'.repeat(50));
  console.log(divider);

  for (const sel of selectors) {
    const sig = lookupSelector(sel);
    const isKnown = !sig.startsWith('unknown');
    console.log(
      `  ${chalk.gray(sel)}  ` +
      (isKnown ? chalk.cyan(sig) : chalk.gray(sig))
    );
  }

  const unknownCount = selectors.filter(s => lookupSelector(s).startsWith('unknown')).length;
  if (unknownCount > 0) {
    console.log(chalk.gray(`\n  ${unknownCount} unknown selector(s). Try https://www.4byte.directory for lookup.`));
  }
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function abiCommand(args: string[]): Promise<void> {
  const address    = args[0] as `0x${string}`;
  const jsonMode   = args.includes('--json');
  const filterFlag = args.findIndex(a => a === '--function' || a === '-f');
  const fnFilter   = filterFlag !== -1 ? args[filterFlag + 1] : undefined;

  if (!args[0] || args[0] === '--help') {
    console.log(chalk.bold.cyan('\n  aura abi <contract-address> [--function <name>] [--json]\n'));
    console.log(chalk.gray('  Fetches ABI from Etherscan (if ETHERSCAN_API_KEY is set)'));
    console.log(chalk.gray('  or falls back to bytecode selector matching.\n'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura abi 0x1234...abcd'));
    console.log(chalk.gray('    aura abi 0x1234...abcd --function transfer'));
    console.log(chalk.gray('    aura abi 0x1234...abcd --json\n'));
    console.log(chalk.gray('  Tip: Set ETHERSCAN_API_KEY in your .env for verified ABI.\n'));
    return;
  }

  if (!isAddress(address)) {
    console.error(chalk.red('\n  Invalid address format\n'));
    return;
  }

  const spinner = ora(chalk.cyan(' Fetching ABI...')).start();

  try {
    const client = getPublicClient();

    // Check it's actually a contract
    const code = await client.getCode({ address });
    if (!code || code === '0x') {
      spinner.stop();
      console.log(chalk.red('\n  Not a contract address.\n'));
      return;
    }

    // Try Etherscan first
    const abi = await fetchFromEtherscan(address);
    spinner.stop();

    if (abi) {
      if (jsonMode) {
        console.log(JSON.stringify(abi, null, 2));
        return;
      }

      console.log(chalk.bold.cyan(`\n  ABI for ${address}`));
      console.log(chalk.green(`  Source: Etherscan (verified)\n`));
      displayAbi(abi, fnFilter);
      console.log('');

    } else {
      // Fallback: bytecode selector matching
      const selectors = extractSelectorsFromBytecode(code);

      if (jsonMode) {
        const result = selectors.map(s => ({ selector: s, signature: lookupSelector(s) }));
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(chalk.bold.cyan(`\n  ABI for ${address}`));
      console.log(
        process.env.ETHERSCAN_API_KEY
          ? chalk.yellow('  Source: Bytecode fallback (contract not verified on Etherscan)\n')
          : chalk.yellow('  Source: Bytecode fallback (set ETHERSCAN_API_KEY for full ABI)\n')
      );

      if (selectors.length === 0) {
        console.log(chalk.gray('  No recognizable selectors found in bytecode.\n'));
      } else {
        displaySelectors(selectors);
        console.log('');
      }
    }

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`\n  Error: ${error instanceof Error ? error.message : String(error)}\n`));
  }
}