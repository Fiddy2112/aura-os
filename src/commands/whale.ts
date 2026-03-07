import chalk from 'chalk';
import { isAddress, formatUnits } from 'viem';
import { getPublicClient } from '../core/blockchain/chains.js';
import { syncActivity } from '../core/utils/supabase.js';

// ── ERC-20 ABIs we need ───────────────────────────────────────────────────────
const ERC20_ABI = [
  { name: 'decimals',    type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'symbol',      type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf',   type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

const TRANSFER_EVENT = {
  anonymous: false,
  name: 'Transfer',
  type: 'event',
  inputs: [
    { indexed: true,  name: 'from',  type: 'address' },
    { indexed: true,  name: 'to',    type: 'address' },
    { indexed: false, name: 'value', type: 'uint256' },
  ],
} as const;

// ─────────────────────────────────────────────────────────────────────────────

export default async function whaleCommand(args: string[]) {
  const address = args[0];
  const limit   = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '10');
  const jsonMode = args.includes('--json');

  if (!address) {
    console.error(chalk.red('\n  Error: Token contract address is required'));
    console.log(chalk.gray('  Usage: aura whale <token-address> [--limit=10] [--json]\n'));
    process.exit(1);
  }

  if (!isAddress(address)) {
    console.error(chalk.red(`\n  Error: Invalid address: ${address}\n`));
    process.exit(1);
  }

  const client = getPublicClient();

  try {
    // ── Fetch token metadata ───────────────────────────────────────────────
    const [symbol, decimals, totalSupply] = await Promise.all([
      client.readContract({ address: address as `0x${string}`, abi: ERC20_ABI, functionName: 'symbol' }),
      client.readContract({ address: address as `0x${string}`, abi: ERC20_ABI, functionName: 'decimals' }),
      client.readContract({ address: address as `0x${string}`, abi: ERC20_ABI, functionName: 'totalSupply' }),
    ]);

    // ── Fetch recent Transfer events (last ~1000 blocks) ──────────────────
    const latestBlock = await client.getBlockNumber();
    const fromBlock   = latestBlock - 1000n;

    console.log(chalk.gray(`\n Scanning Transfer events for ${symbol}...`));

    const logs = await client.getLogs({
      address: address as `0x${string}`,
      event: TRANSFER_EVENT,
      fromBlock,
      toBlock: latestBlock,
    });

    // ── Aggregate by sender/receiver ──────────────────────────────────────
    const flows: Record<string, { in: bigint; out: bigint }> = {};

    for (const log of logs) {
      const { from, to, value } = log.args as { from: string; to: string; value: bigint };
      if (!flows[from]) flows[from] = { in: 0n, out: 0n };
      if (!flows[to])   flows[to]   = { in: 0n, out: 0n };
      flows[from].out += value;
      flows[to].in    += value;
    }

    // ── Build whale list — sort by net inflow (accumulation) ─────────────
    const whales = Object.entries(flows)
      .map(([addr, { in: inflow, out: outflow }]) => ({
        address: addr,
        netFlow: inflow - outflow,
        inflow,
        outflow,
        pct: totalSupply > 0n
          ? (Number(formatUnits(inflow, decimals)) / Number(formatUnits(totalSupply, decimals)) * 100)
          : 0,
      }))
      .sort((a, b) => (b.netFlow > a.netFlow ? 1 : -1))
      .slice(0, limit);

    // ── JSON mode ─────────────────────────────────────────────────────────
    if (jsonMode) {
      console.log(JSON.stringify({ symbol, decimals, totalSupply: totalSupply.toString(), whales }, null, 2));
      return;
    }

    // ── Display ───────────────────────────────────────────────────────────
    const divider = '─'.repeat(70);
    console.log(chalk.bold.cyan(`\n🐋 Whale Tracker — ${symbol}`));
    console.log(chalk.gray(` Blocks scanned: ${fromBlock} → ${latestBlock}  |  Transfers: ${logs.length}`));
    console.log(chalk.gray(divider));
    console.log(
      chalk.gray(' Address'.padEnd(46)) +
      chalk.gray('Net Flow'.padStart(14)) +
      chalk.gray('Supply %'.padStart(10))
    );
    console.log(chalk.gray(divider));

    for (const w of whales) {
      const net    = Number(formatUnits(w.netFlow < 0n ? -w.netFlow : w.netFlow, decimals));
      const sign   = w.netFlow >= 0n ? chalk.green('+') : chalk.red('-');
      const color  = w.netFlow >= 0n ? chalk.green : chalk.red;
      const netStr = color(`${sign}${net.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol}`);
      const pctStr = chalk.gray(`${w.pct.toFixed(3)}%`);

      console.log(` ${chalk.cyan(w.address)}  ${netStr.padStart(24)}  ${pctStr.padStart(8)}`);
    }

    console.log(chalk.gray(divider));

    const accumulators = whales.filter(w => w.netFlow > 0n).length;
    const distributors = whales.filter(w => w.netFlow < 0n).length;
    const signal = accumulators > distributors ? chalk.green('ACCUMULATION') : chalk.red('DISTRIBUTION');
    console.log(chalk.bold(`\n Whale Signal: ${signal}`));
    console.log(chalk.gray(` Accumulators: ${accumulators}  |  Distributors: ${distributors}\n`));

    await syncActivity('WHALE', { address, symbol }, `Whale signal for ${symbol}: ${accumulators > distributors ? 'ACCUMULATION' : 'DISTRIBUTION'}`);

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  Error: ${msg}\n`));
    process.exit(1);
  }
}