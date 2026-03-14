import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import { isAddress } from 'viem';
import { getPublicClient } from '../core/blockchain/chains.js';

// ── Price polling ─────────────────────────────────────────────────────────────

const SYMBOL_TO_COINGECKO: Record<string, string> = {
  btc: 'bitcoin', eth: 'ethereum', sol: 'solana',
  bnb: 'binancecoin', matic: 'matic-network', avax: 'avalanche-2',
  link: 'chainlink', uni: 'uniswap', aave: 'aave',
  usdc: 'usd-coin', usdt: 'tether', dai: 'dai',
  arb: 'arbitrum', op: 'optimism', pepe: 'pepe',
};

async function fetchPrice(symbol: string): Promise<number | null> {
  const id = SYMBOL_TO_COINGECKO[symbol.toLowerCase()] ?? symbol.toLowerCase();
  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params:  { ids: id, vs_currencies: 'usd' },
      timeout: 6000,
    });
    return res.data[id]?.usd ?? null;
  } catch { return null; }
}

// ── Wallet watcher ────────────────────────────────────────────────────────────

async function watchWallet(
  address:   `0x${string}`,
  onTx:      (txHash: string, type: string) => void,
  signal:    AbortSignal,
): Promise<void> {
  const client    = getPublicClient();
  let   lastBlock = await client.getBlockNumber();

  while (!signal.aborted) {
    try {
      const current = await client.getBlockNumber();

      for (let b = lastBlock + 1n; b <= current; b++) {
        if (signal.aborted) break;
        const block = await client.getBlock({ blockNumber: b, includeTransactions: true });

        for (const tx of block.transactions as any[]) {
          const from = tx.from?.toLowerCase();
          const to   = tx.to?.toLowerCase();
          const addr = address.toLowerCase();

          if (from === addr) onTx(tx.hash, 'outgoing');
          else if (to === addr) onTx(tx.hash, 'incoming');
        }
      }
      lastBlock = current;
      await new Promise(r => setTimeout(r, 3000));
    } catch { await new Promise(r => setTimeout(r, 5000)); }
  }
}

// ── Notification ──────────────────────────────────────────────────────────────

function notify(title: string, message: string, urgent = false): void {
  const color = urgent ? chalk.red : chalk.green;
  const ts    = new Date().toLocaleTimeString();

  console.log('');
  console.log(color(`  ▲ ALERT [${ts}]`));
  console.log(color(`  ${title}`));
  console.log(chalk.white(`  ${message}`));
  console.log('');

  // Try system notification (macOS/Linux)
  try {
    const { execSync } = require('child_process');
    if (process.platform === 'darwin') {
      execSync(`osascript -e 'display notification "${message}" with title "Aura OS: ${title}"'`, { stdio: 'ignore' });
    } else if (process.platform === 'linux') {
      execSync(`notify-send "Aura OS: ${title}" "${message}"`, { stdio: 'ignore' });
    }
  } catch {}
}

// ── Subcommands ───────────────────────────────────────────────────────────────

async function alertPrice(args: string[]): Promise<void> {
  // aura alert price <token> <above|below> <value>
  const [token, direction, thresholdRaw] = args;
  const threshold = parseFloat(thresholdRaw);

  if (!token || !direction || isNaN(threshold)) {
    console.log(chalk.bold.cyan('\n  aura alert price <token> <above|below> <price>\n'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura alert price ETH above 4000'));
    console.log(chalk.gray('    aura alert price BTC below 50000\n'));
    return;
  }

  if (direction !== 'above' && direction !== 'below') {
    console.error(chalk.red('\n  Direction must be "above" or "below"\n'));
    return;
  }

  const controller  = new AbortController();
  const intervalSec = 30;

  console.log(chalk.bold.cyan('\n  Price Alert Active'));
  console.log(chalk.gray('  ' + '─'.repeat(40)));
  console.log(`  ${chalk.gray('Token:    ')} ${chalk.white(token.toUpperCase())}`);
  console.log(`  ${chalk.gray('Condition:')} ${chalk.yellow(`${direction} $${threshold.toLocaleString()}`)}`);
  console.log(`  ${chalk.gray('Interval: ')} ${chalk.gray(`${intervalSec}s`)}`);
  console.log(chalk.gray('\n  Press Ctrl+C to cancel.\n'));

  process.on('SIGINT', () => {
    controller.abort();
    console.log(chalk.gray('\n  Alert cancelled.\n'));
    process.exit(0);
  });

  let lastPrice = 0;

  while (!controller.signal.aborted) {
    const price = await fetchPrice(token);

    if (price === null) {
      process.stdout.write(chalk.gray(`  Waiting... (price unavailable)\r`));
    } else {
      const arrow = price > lastPrice ? '↑' : price < lastPrice ? '↓' : '→';
      process.stdout.write(
        chalk.gray(`  ${token.toUpperCase()}: `) +
        chalk.yellow(`$${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`) +
        chalk.gray(` ${arrow}  (target: ${direction} $${threshold.toLocaleString()})`) +
        '                \r',
      );

      const triggered =
        (direction === 'above' && price >= threshold) ||
        (direction === 'below' && price <= threshold);

      if (triggered) {
        controller.abort();
        notify(
          `${token.toUpperCase()} Price Alert`,
          `${token.toUpperCase()} is ${direction} $${threshold.toLocaleString()} — now $${price.toLocaleString()}`,
          true,
        );
        process.exit(0);
      }

      lastPrice = price;
    }

    await new Promise(r => setTimeout(r, intervalSec * 1000));
  }
}

async function alertWallet(args: string[]): Promise<void> {
  // aura alert wallet <address>
  const address = args[0] as `0x${string}`;

  if (!address || args[0] === '--help') {
    console.log(chalk.bold.cyan('\n  aura alert wallet <address>\n'));
    console.log(chalk.gray('  Watch a wallet for incoming/outgoing transactions.\n'));
    console.log(chalk.gray('  Example: aura alert wallet 0xd8dA6BF...\n'));
    return;
  }

  if (!isAddress(address)) { console.error(chalk.red('\n  Invalid address\n')); return; }

  const controller = new AbortController();

  console.log(chalk.bold.cyan('\n  Wallet Watcher Active'));
  console.log(chalk.gray('  ' + '─'.repeat(40)));
  console.log(`  ${chalk.gray('Address:')} ${chalk.cyan(`${address.slice(0, 10)}...${address.slice(-6)}`)}`);
  console.log(chalk.gray('\n  Watching for transactions... Press Ctrl+C to stop.\n'));

  process.on('SIGINT', () => {
    controller.abort();
    console.log(chalk.gray('\n  Watcher stopped.\n'));
    process.exit(0);
  });

  const spinner = ora(chalk.gray(' Waiting for transactions...')).start();

  await watchWallet(address, (txHash, type) => {
    spinner.stop();
    const icon  = type === 'incoming' ? chalk.green('↓ IN ') : chalk.red('↑ OUT');
    const label = type === 'incoming' ? 'Incoming transaction' : 'Outgoing transaction';
    const ts    = new Date().toLocaleTimeString();

    console.log(`  ${icon}  ${chalk.gray(txHash.slice(0, 20))}...  ${chalk.gray(ts)}`);
    notify(`Wallet Activity: ${address.slice(0, 10)}...`, `${label}: ${txHash.slice(0, 18)}...`);
    spinner.start(chalk.gray(' Watching...'));
  }, controller.signal);
}

async function alertWebhook(args: string[]): Promise<void> {
  // aura alert webhook <url> --test
  const url     = args[0];
  const isTest  = args.includes('--test');

  if (!url || url === '--help') {
    console.log(chalk.bold.cyan('\n  aura alert webhook <url> [--test]\n'));
    console.log(chalk.gray('  Configure a webhook endpoint for Aura alerts.\n'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura alert webhook https://hooks.slack.com/...'));
    console.log(chalk.gray('    aura alert webhook https://myapp.com/webhook --test\n'));
    return;
  }

  try { new URL(url); } catch {
    console.error(chalk.red('\n  Invalid URL\n'));
    return;
  }

  if (isTest) {
    const spinner = ora(chalk.cyan(' Sending test webhook...')).start();
    try {
      await axios.post(url, {
        source:  'aura-os',
        type:    'test',
        message: 'Aura OS webhook test',
        ts:      new Date().toISOString(),
      }, { timeout: 8000 });
      spinner.succeed(chalk.green(' ✓ Webhook test successful!'));
    } catch (e) {
      spinner.fail(chalk.red(` Webhook failed: ${e instanceof Error ? e.message : String(e)}`));
    }
    return;
  }

  // Save webhook URL to env
  const { existsSync, readFileSync, writeFileSync } = require('fs');
  const { join } = require('path');
  const { homedir } = require('os');
  const envPath = join(homedir(), '.config', 'aura-os', '.env');

  let content = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const regex  = /^AURA_WEBHOOK_URL=.*/m;
  content      = regex.test(content)
    ? content.replace(regex, `AURA_WEBHOOK_URL=${url}`)
    : content + `\nAURA_WEBHOOK_URL=${url}`;
  writeFileSync(envPath, content.trim() + '\n');

  console.log(chalk.green(`\n  ✓ Webhook saved: ${url}\n`));
  console.log(chalk.gray('  Run with --test to verify the endpoint.\n'));
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function alertCommand(args: string[]): Promise<void> {
  const sub = args[0];

  if (!sub || sub === '--help') {
    console.log(chalk.bold.cyan('\n  aura alert <subcommand>\n'));
    console.log(chalk.gray('  Subcommands:'));
    console.log(chalk.gray('    price <token> <above|below> <value>  — price trigger'));
    console.log(chalk.gray('    wallet <address>                     — wallet activity watch'));
    console.log(chalk.gray('    webhook <url> [--test]               — configure webhook\n'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura alert price ETH above 4000'));
    console.log(chalk.gray('    aura alert wallet 0xd8dA...'));
    console.log(chalk.gray('    aura alert webhook https://hooks.slack.com/... --test\n'));
    return;
  }

  const subArgs = args.slice(1);

  switch (sub) {
    case 'price':   await alertPrice(subArgs);   break;
    case 'wallet':  await alertWallet(subArgs);  break;
    case 'webhook': await alertWebhook(subArgs); break;
    default:
      console.error(chalk.red(`\n  Unknown subcommand: "${sub}". Use price, wallet, or webhook.\n`));
  }
}