import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import { isAddress, keccak256, toHex, toBytes } from 'viem';
import { getPublicClient, getCurrentChain } from '../core/blockchain/chains.js';

// ── Common event signatures ───────────────────────────────────────────────────

const COMMON_EVENTS: Record<string, string> = {
  'Transfer(address,address,uint256)':     '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  'Approval(address,address,uint256)':     '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
  'Swap(address,uint256,uint256,uint256,uint256,address)': '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
  'Mint(address,uint256,uint256)':         '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f',
  'Burn(address,uint256,uint256,address)': '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496',
  'Deposit(address,uint256)':              '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c',
  'Withdrawal(address,uint256)':           '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65',
  'OwnershipTransferred(address,address)': '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0',
  'Upgraded(address)':                     '0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b',
  'Paused(address)':                       '0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258',
  'Unpaused(address)':                     '0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa',
};

// Build reverse map: topic0 → signature
const TOPIC_TO_SIG = new Map<string, string>(
  Object.entries(COMMON_EVENTS).map(([sig, topic]) => [topic, sig]),
);

// ── 4byte event lookup ────────────────────────────────────────────────────────

async function lookupEventTopic(topic: string): Promise<string | null> {
  if (TOPIC_TO_SIG.has(topic)) return TOPIC_TO_SIG.get(topic)!;
  try {
    const res = await axios.get('https://www.4byte.directory/api/v1/event-signatures/', {
      params: { hex_signature: topic }, timeout: 4000,
    });
    return res.data.results?.[0]?.text_signature ?? null;
  } catch { return null; }
}

// ── Format log value ──────────────────────────────────────────────────────────

function formatLogValue(hex: string): string {
  if (!hex || hex === '0x') return '0x';
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;

  // Address
  if (clean.startsWith('000000000000000000000000') && clean.length === 64) {
    return '0x' + clean.slice(24);
  }

  // Large uint
  try {
    const val = BigInt('0x' + clean);
    if (val === 0n) return '0';
    const asEther = Number(val) / 1e18;
    if (asEther > 0.0001 && asEther < 1e15) {
      return `${val.toLocaleString()} (~${asEther.toFixed(4)} if 18 dec)`;
    }
    return val.toLocaleString();
  } catch { return hex.slice(0, 42) + '...'; }
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function logsCommand(args: string[]): Promise<void> {
  const address  = args[0] as `0x${string}`;
  const jsonMode = args.includes('--json');

  const eventIdx  = args.indexOf('--event');
  const blocksIdx = args.indexOf('--blocks');
  const fromIdx   = args.indexOf('--from');
  const toIdx     = args.indexOf('--to');

  const eventSig  = eventIdx  !== -1 ? args[eventIdx  + 1] : undefined;
  const blockRange = blocksIdx !== -1 ? parseInt(args[blocksIdx + 1]) : 10_000;
  const fromAddr  = fromIdx   !== -1 ? args[fromIdx   + 1] : undefined;
  const toAddr    = toIdx     !== -1 ? args[toIdx     + 1] : undefined;

  if (!address || args[0] === '--help') {
    console.log(chalk.bold.cyan('\n  aura logs <contract-address> [options]\n'));
    console.log(chalk.gray('  Parse and decode on-chain event logs.\n'));
    console.log(chalk.gray('  Options:'));
    console.log(chalk.gray('    --event <sig>       Filter by event signature e.g. "Transfer(address,address,uint256)"'));
    console.log(chalk.gray('    --blocks <n>        Scan last n blocks (default: 10000)'));
    console.log(chalk.gray('    --from <address>    Filter by indexed "from" topic'));
    console.log(chalk.gray('    --to <address>      Filter by indexed "to" topic'));
    console.log(chalk.gray('    --json              Raw JSON output\n'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura logs 0xA0b86... --event "Transfer(address,address,uint256)"'));
    console.log(chalk.gray('    aura logs 0xA0b86... --blocks 5000 --from 0x1234...\n'));
    return;
  }

  if (!isAddress(address)) { console.error(chalk.red('\n  Invalid address\n')); return; }

  const client    = getPublicClient();
  const chain     = getCurrentChain();
  const spinner   = ora(chalk.cyan(' Fetching logs...')).start();

  try {
    const latest    = await client.getBlockNumber();
    const fromBlock = latest > BigInt(blockRange) ? latest - BigInt(blockRange) : 0n;

    // Build topics filter
    const topics: (`0x${string}` | null)[] = [];

    if (eventSig) {
      const sig = eventSig.trim();
      // Accept either full sig "Transfer(...)" or already a hash
      const topic0 = sig.startsWith('0x') && sig.length === 66
        ? sig as `0x${string}`
        : COMMON_EVENTS[sig] as `0x${string}` ?? keccak256(toHex(toBytes(sig))) as `0x${string}`;
      topics.push(topic0);

      // Optional topic filters for from/to
      if (fromAddr && isAddress(fromAddr)) {
        topics.push(`0x${fromAddr.slice(2).toLowerCase().padStart(64, '0')}` as `0x${string}`);
      } else if (fromAddr) {
        topics.push(null);
      }
      if (toAddr && isAddress(toAddr)) {
        topics.push(`0x${toAddr.slice(2).toLowerCase().padStart(64, '0')}` as `0x${string}`);
      }
    }

    const logs = await client.getLogs({
      address,
      fromBlock,
      toBlock: latest,
      topics:  topics.length > 0 ? topics : undefined,
    } as Parameters<typeof client.getLogs>[0]);

    spinner.stop();

    if (logs.length === 0) {
      console.log(chalk.yellow(`\n  No logs found in last ${blockRange.toLocaleString()} blocks.\n`));
      return;
    }

    if (jsonMode) {
      const out = logs.map(l => ({
        blockNumber: l.blockNumber?.toString(),
        txHash:      l.transactionHash,
        logIndex:    l.logIndex,
        topics:      l.topics,
        data:        l.data,
      }));
      console.log(JSON.stringify(out, null, 2));
      return;
    }

    // Decode event names
    const topicCache = new Map<string, string | null>();
    const decoded    = await Promise.all(logs.slice(0, 100).map(async (log) => {
      const t0 = log.topics[0] ?? '';
      if (!topicCache.has(t0)) {
        topicCache.set(t0, await lookupEventTopic(t0));
      }
      return { ...log, eventName: topicCache.get(t0) };
    }));

    const divider = chalk.gray('─'.repeat(62));
    console.log(chalk.bold.cyan(`\n  Event Logs: ${address.slice(0, 10)}...${address.slice(-6)}`));
    console.log(chalk.gray(`  ${logs.length} log(s) in last ${blockRange.toLocaleString()} blocks  [${chain.name}]`));
    console.log(divider);

    for (const log of decoded) {
      const eventLabel = log.eventName
        ? chalk.magenta(log.eventName.split('(')[0])
        : chalk.gray(log.topics[0]?.slice(0, 18) + '...');

      console.log(`  ${eventLabel}  ${chalk.gray(`block ${log.blockNumber}`)}`);
      console.log(`  ${chalk.gray('tx:')} ${chalk.gray(log.transactionHash?.slice(0, 20) + '...')}`);

      // Show indexed topics (skip topic[0] = event sig)
      log.topics.slice(1).forEach((t, i) => {
        console.log(`  ${chalk.gray(`topic[${i + 1}]:`)} ${chalk.cyan(formatLogValue(t))}`);
      });

      // Show data if present
      if (log.data && log.data !== '0x') {
        const dataClean = log.data.slice(2);
        for (let i = 0; i < Math.min(dataClean.length, 192); i += 64) {
          const chunk = '0x' + dataClean.slice(i, i + 64);
          console.log(`  ${chalk.gray(`data[${i/64}]:   `)} ${chalk.white(formatLogValue(chunk))}`);
        }
        if (dataClean.length > 192) console.log(chalk.gray(`  ... (${dataClean.length / 64} total data slots)`));
      }

      console.log(chalk.gray('  ' + '─'.repeat(60)));
    }

    if (logs.length > 100) {
      console.log(chalk.gray(`\n  Showing 100 of ${logs.length} logs. Use --json for full output.\n`));
    } else {
      console.log('');
    }

  } catch (error) {
    spinner.stop();
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('block range') || msg.includes('too many')) {
      console.error(chalk.red('\n  Block range too large. Try --blocks 1000\n'));
    } else {
      console.error(chalk.red(`\n  Error: ${msg.slice(0, 150)}\n`));
    }
  }
}