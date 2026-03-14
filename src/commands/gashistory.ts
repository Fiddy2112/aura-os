import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import { formatGwei } from 'viem';
import { getPublicClient, getCurrentChain } from '../core/blockchain/chains.js';
import { EvCharger, Medal, Rocket, Turtle, Zap } from 'lucide-react';

// ── ASCII sparkline ───────────────────────────────────────────────────────────

const SPARK_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

function sparkline(values: number[]): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values.map(v => {
    const idx = Math.floor(((v - min) / range) * (SPARK_CHARS.length - 1));
    const char = SPARK_CHARS[Math.max(0, Math.min(idx, SPARK_CHARS.length - 1))];
    // Color by level
    if (idx <= 1)                       return chalk.green(char);
    if (idx <= 3)                       return chalk.yellow(char);
    if (idx <= 5)                       return chalk.red(char);
    return chalk.bold.red(char);
  }).join('');
}

// ── Etherscan gas oracle history ──────────────────────────────────────────────

interface GasPoint {
  timestamp:   number;
  baseFee:     number; // gwei
  priorityFee: number; // gwei
  label:       string;
}

async function fetchGasHistory(chainId: number, hours: number): Promise<GasPoint[]> {
  // Use Etherscan gas oracle + block history
  const apiKey = process.env.ETHERSCAN_API_KEY;

  const baseUrls: Record<number, string> = {
    1:     'https://api.etherscan.io/api',
    137:   'https://api.polygonscan.com/api',
    8453:  'https://api.basescan.org/api',
    10:    'https://api-optimistic.etherscan.io/api',
    42161: 'https://api.arbiscan.io/api',
  };

  const baseUrl = baseUrls[chainId];
  if (!baseUrl) return [];

  try {
    // Fetch recent blocks fee history via eth_feeHistory approximation
    const client    = getPublicClient();
    const latest    = await client.getBlockNumber();
    // ~12s per block on mainnet, so hours*300 blocks ≈ hours of data
    const blocksPerHour = 300;
    const totalBlocks   = Math.min(hours * blocksPerHour, 2000);
    const step          = Math.max(1, Math.floor(totalBlocks / 48)); // 48 data points

    const points: GasPoint[] = [];

    for (let i = 0; i < 48; i++) {
      const blockNum = latest - BigInt(i * step);
      if (blockNum < 0n) break;

      try {
        const block = await client.getBlock({ blockNumber: blockNum });
        const baseFee = block.baseFeePerGas ? Number(formatGwei(block.baseFeePerGas)) : 0;
        const ts      = Number(block.timestamp);
        const date    = new Date(ts * 1000);
        const label   = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

        points.unshift({
          timestamp:   ts,
          baseFee:     Math.round(baseFee * 10) / 10,
          priorityFee: 0.5, // estimated tip
          label,
        });
      } catch {}
    }

    return points;
  } catch { return []; }
}

// ── On-chain current gas ──────────────────────────────────────────────────────

interface CurrentGas {
  baseFee:  number;
  slow:     number;
  standard: number;
  fast:     number;
  rapid:    number;
}

async function getCurrentGas(): Promise<CurrentGas> {
  const client  = getPublicClient();
  const block   = await client.getBlock({ blockTag: 'latest' });
  const baseFee = block.baseFeePerGas ? Number(formatGwei(block.baseFeePerGas)) : 0;

  // Estimate tiers
  return {
    baseFee,
    slow:     Math.round((baseFee + 0.1) * 10) / 10,
    standard: Math.round((baseFee + 1.5) * 10) / 10,
    fast:     Math.round((baseFee + 3.0) * 10) / 10,
    rapid:    Math.round((baseFee + 6.0) * 10) / 10,
  };
}

// ── Best time analysis ────────────────────────────────────────────────────────

function findBestHours(points: GasPoint[]): { hour: string; avgGas: number }[] {
  const byHour: Record<string, number[]> = {};

  for (const p of points) {
    const hour = new Date(p.timestamp * 1000).getUTCHours();
    const key  = String(hour).padStart(2, '0') + ':00 UTC';
    if (!byHour[key]) byHour[key] = [];
    byHour[key].push(p.baseFee);
  }

  return Object.entries(byHour)
    .map(([hour, fees]) => ({
      hour,
      avgGas: Math.round((fees.reduce((a, b) => a + b, 0) / fees.length) * 10) / 10,
    }))
    .sort((a, b) => a.avgGas - b.avgGas)
    .slice(0, 3);
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function gashistoryCommand(args: string[]): Promise<void> {
  const hoursIdx = args.indexOf('--hours');
  const hours    = hoursIdx !== -1 ? parseInt(args[hoursIdx + 1]) : 24;
  const jsonMode = args.includes('--json');

  if (args[0] === '--help') {
    console.log(chalk.bold.cyan('\n  aura gashistory [--hours <n>]\n'));
    console.log(chalk.gray('  Display gas price history and best time to transact.\n'));
    console.log(chalk.gray('  Options:'));
    console.log(chalk.gray('    --hours <n>   Hours of history (default: 24, max: 168)\n'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura gashistory'));
    console.log(chalk.gray('    aura gashistory --hours 48\n'));
    return;
  }

  const chain   = getCurrentChain();
  const spinner = ora(chalk.cyan(' Fetching gas history...')).start();

  try {
    const [history, current] = await Promise.all([
      fetchGasHistory(chain.id, Math.min(hours, 168)),
      getCurrentGas(),
    ]);

    spinner.stop();

    if (jsonMode) {
      console.log(JSON.stringify({ current, history }, null, 2));
      return;
    }

    const divider = chalk.gray('─'.repeat(56));

    // ── Current gas ───────────────────────────────────────────────────────────
    console.log(chalk.bold.cyan('\n  Gas Prices'));
    console.log(chalk.gray(`  Chain: ${chain.name}`));
    console.log(divider);
    console.log(`  ${chalk.gray('Base Fee:')} ${chalk.yellow(`${current.baseFee} gwei`)}`);
    console.log('');
    console.log(`  ${chalk.green(`${Turtle} Slow:    `)} ${chalk.white(`${current.slow} gwei`)}`);
    console.log(`  ${chalk.yellow(`${Zap} Standard:`)} ${chalk.white(`${current.standard} gwei`)}`);
    console.log(`  ${chalk.red(`${EvCharger} Fast:    `)} ${chalk.white(`${current.fast} gwei`)}`);
    console.log(`  ${chalk.bold.red(`${Rocket} Rapid:   `)} ${chalk.white(`${current.rapid} gwei`)}`);

    // ── Sparkline chart ───────────────────────────────────────────────────────
    if (history.length > 0) {
      console.log(divider);
      console.log(chalk.bold.white(`\n  Base Fee — Last ${hours}h`));

      const fees      = history.map(p => p.baseFee);
      const minFee    = Math.min(...fees);
      const maxFee    = Math.max(...fees);
      const avgFee    = fees.reduce((a, b) => a + b, 0) / fees.length;

      // Chart with y-axis labels
      const chartWidth = Math.min(history.length, 60);
      const sample     = history.slice(-chartWidth);
      const spark      = sparkline(sample.map(p => p.baseFee));

      console.log('');
      console.log(`  ${chalk.gray(`${maxFee} gwei`)} ┐`);
      console.log(`  ${' '.repeat(String(maxFee).length + 5)}${spark}`);
      console.log(`  ${chalk.gray(`${minFee} gwei`)} ┘`);

      // Time axis
      const first = sample[0]?.label ?? '';
      const last  = sample[sample.length - 1]?.label ?? '';
      console.log(`  ${chalk.gray(first)}${' '.repeat(Math.max(0, spark.length / 3 - first.length))}${chalk.gray(last)}`);

      console.log('');
      console.log(`  ${chalk.gray('Min:')} ${chalk.green(`${minFee} gwei`)}  ${chalk.gray('Avg:')} ${chalk.yellow(`${avgFee.toFixed(1)} gwei`)}  ${chalk.gray('Max:')} ${chalk.red(`${maxFee} gwei`)}`);

      // ── Best time to transact ─────────────────────────────────────────────
      const bestHours = findBestHours(history);
      if (bestHours.length > 0) {
        console.log(divider);
        console.log(chalk.bold.white('\n  Best Times to Transact (lowest avg gas):'));
        bestHours.forEach((b, i) => {
          const medals = ['🥇', '🥈', '🥉'];
          const medal = medals[i] ?? '  ';
          console.log(`  ${medal}  ${chalk.cyan(b.hour)}  ${chalk.green(`avg ${b.avgGas} gwei`)}`);
        });
      }
    } else {
      console.log(chalk.gray('\n  No historical data available for this chain.'));
    }

    console.log('');

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`\n  Error: ${error instanceof Error ? error.message : String(error)}\n`));
  }
}