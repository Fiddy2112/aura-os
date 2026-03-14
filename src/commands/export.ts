import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { isAddress } from 'viem';
import { getCurrentChain } from '../core/blockchain/chains.js';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TxRecord {
  date:          string;
  txHash:        string;
  type:          string;  // SEND / RECEIVE / SWAP / CONTRACT
  from:          string;
  to:            string;
  valueETH:      string;
  tokenSymbol:   string;
  tokenAmount:   string;
  gasCostETH:    string;
  blockNumber:   number;
  chain:         string;
}

// ── Etherscan fetch ───────────────────────────────────────────────────────────

const EXPLORER_URLS: Record<number, string> = {
  1:     'https://api.etherscan.io/api',
  137:   'https://api.polygonscan.com/api',
  8453:  'https://api.basescan.org/api',
  10:    'https://api-optimistic.etherscan.io/api',
  42161: 'https://api.arbiscan.io/api',
  56:    'https://api.bscscan.com/api',
};

async function fetchNormalTxs(address: string, apiKey: string, chainId: number) {
  const url = EXPLORER_URLS[chainId];
  if (!url) return [];

  const res = await axios.get(url, {
    params: { module: 'account', action: 'txlist', address, sort: 'desc', apikey: apiKey },
    timeout: 15000,
  });
  return res.data.status === '1' ? res.data.result ?? [] : [];
}

async function fetchTokenTxs(address: string, apiKey: string, chainId: number) {
  const url = EXPLORER_URLS[chainId];
  if (!url) return [];

  const res = await axios.get(url, {
    params: { module: 'account', action: 'tokentx', address, sort: 'desc', apikey: apiKey },
    timeout: 15000,
  });
  return res.data.status === '1' ? res.data.result ?? [] : [];
}

// ── Transform to records ──────────────────────────────────────────────────────

function normalTxToRecord(tx: any, address: string, chainName: string): TxRecord {
  const isSend    = tx.from.toLowerCase() === address.toLowerCase();
  const ethValue  = (parseInt(tx.value) / 1e18).toFixed(8);
  const gasUsed   = parseInt(tx.gasUsed ?? tx.gas ?? 0);
  const gasPrice  = parseInt(tx.gasPrice ?? 0);
  const gasCost   = ((gasUsed * gasPrice) / 1e18).toFixed(8);
  const ts        = new Date(parseInt(tx.timeStamp) * 1000).toISOString();

  let type = isSend ? 'SEND' : 'RECEIVE';
  if (tx.input && tx.input !== '0x') type = 'CONTRACT';

  return {
    date:         ts,
    txHash:       tx.hash,
    type,
    from:         tx.from,
    to:           tx.to ?? 'contract creation',
    valueETH:     ethValue,
    tokenSymbol:  'ETH',
    tokenAmount:  ethValue,
    gasCostETH:   gasCost,
    blockNumber:  parseInt(tx.blockNumber),
    chain:        chainName,
  };
}

function tokenTxToRecord(tx: any, address: string, chainName: string): TxRecord {
  const isIn      = tx.to.toLowerCase() === address.toLowerCase();
  const decimals  = parseInt(tx.tokenDecimal ?? 18);
  const amount    = (parseInt(tx.value) / 10 ** decimals).toFixed(8);
  const gasCost   = ((parseInt(tx.gasUsed ?? 0) * parseInt(tx.gasPrice ?? 0)) / 1e18).toFixed(8);
  const ts        = new Date(parseInt(tx.timeStamp) * 1000).toISOString();

  return {
    date:         ts,
    txHash:       tx.hash,
    type:         isIn ? 'RECEIVE' : 'SEND',
    from:         tx.from,
    to:           tx.to,
    valueETH:     '0',
    tokenSymbol:  tx.tokenSymbol ?? '???',
    tokenAmount:  amount,
    gasCostETH:   gasCost,
    blockNumber:  parseInt(tx.blockNumber),
    chain:        chainName,
  };
}

// ── CSV serializer ────────────────────────────────────────────────────────────

function toCSV(records: TxRecord[]): string {
  const headers = [
    'Date', 'TxHash', 'Type', 'From', 'To',
    'ValueETH', 'TokenSymbol', 'TokenAmount', 'GasCostETH', 'BlockNumber', 'Chain',
  ];

  const escape = (val: string) =>
    val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;

  const rows = records.map(r => [
    escape(r.date), escape(r.txHash), r.type,
    escape(r.from), escape(r.to), r.valueETH,
    r.tokenSymbol, r.tokenAmount, r.gasCostETH,
    String(r.blockNumber), r.chain,
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function exportCommand(args: string[]): Promise<void> {
  const address    = args[0] as `0x${string}`;
  const formatIdx  = args.indexOf('--format');
  const outputIdx  = args.indexOf('--output');
  const format     = formatIdx !== -1 ? args[formatIdx + 1] : 'csv';
  const outputDir  = outputIdx !== -1 ? args[outputIdx + 1] : '.';

  if (!address || args[0] === '--help') {
    console.log(chalk.bold.cyan('\n  aura export <wallet-address> [options]\n'));
    console.log(chalk.gray('  Export full transaction history for tax / accounting.\n'));
    console.log(chalk.gray('  Options:'));
    console.log(chalk.gray('    --format csv|json   Output format (default: csv)'));
    console.log(chalk.gray('    --output <dir>      Output directory (default: current dir)\n'));
    console.log(chalk.gray('  Requires ETHERSCAN_API_KEY in .env\n'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura export 0xd8dA6BF...'));
    console.log(chalk.gray('    aura export 0xd8dA6BF... --format json --output ./reports\n'));
    return;
  }

  if (!isAddress(address)) { console.error(chalk.red('\n  Invalid address\n')); return; }
  if (format !== 'csv' && format !== 'json') {
    console.error(chalk.red('\n  Format must be "csv" or "json"\n'));
    return;
  }

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    console.error(chalk.red('\n  ETHERSCAN_API_KEY not set. Run "aura setup" to configure.\n'));
    return;
  }

  const chain   = getCurrentChain();
  const spinner = ora(chalk.cyan(' Fetching transactions...')).start();

  try {
    const [normalTxs, tokenTxs] = await Promise.all([
      fetchNormalTxs(address.toLowerCase(), apiKey, chain.id),
      fetchTokenTxs(address.toLowerCase(),  apiKey, chain.id),
    ]);

    spinner.text = chalk.cyan(` Processing ${normalTxs.length + tokenTxs.length} transactions...`);

    // Convert to records
    const records: TxRecord[] = [
      ...normalTxs.map((tx: any) => normalTxToRecord(tx, address.toLowerCase(), chain.name)),
      ...tokenTxs.map( (tx: any) => tokenTxToRecord( tx, address.toLowerCase(), chain.name)),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Deduplicate by hash+type (token txs and normal txs can share same hash)
    const seen = new Set<string>();
    const deduped = records.filter(r => {
      const key = `${r.txHash}-${r.tokenSymbol}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    spinner.stop();

    // Write output
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const addrShort = address.slice(2, 10);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename  = `aura-export-${addrShort}-${chain.name}-${timestamp}.${format}`;
    const filepath  = path.join(outputDir, filename);

    const content = format === 'csv'
      ? toCSV(deduped)
      : JSON.stringify(deduped, null, 2);

    fs.writeFileSync(filepath, content, 'utf8');

    // Summary
    const sends    = deduped.filter(r => r.type === 'SEND').length;
    const receives = deduped.filter(r => r.type === 'RECEIVE').length;
    const contracts = deduped.filter(r => r.type === 'CONTRACT').length;
    const tokens   = new Set(deduped.map(r => r.tokenSymbol)).size;

    console.log(chalk.bold.cyan('\n  Export Complete'));
    console.log(chalk.gray('  ' + '─'.repeat(44)));
    console.log(`  ${chalk.gray('File:      ')} ${chalk.cyan(filepath)}`);
    console.log(`  ${chalk.gray('Records:   ')} ${chalk.white(deduped.length.toLocaleString())}`);
    console.log(`  ${chalk.gray('Sends:     ')} ${chalk.white(sends)}`);
    console.log(`  ${chalk.gray('Receives:  ')} ${chalk.white(receives)}`);
    console.log(`  ${chalk.gray('Contracts: ')} ${chalk.white(contracts)}`);
    console.log(`  ${chalk.gray('Tokens:    ')} ${chalk.white(tokens)}`);
    console.log(`  ${chalk.gray('Chain:     ')} ${chalk.cyan(chain.name)}\n`);

    console.log(chalk.gray('  Compatible with: Koinly, CoinTracker, TaxBit, CryptoTaxCalc\n'));

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`\n  Error: ${error instanceof Error ? error.message : String(error)}\n`));
  }
}