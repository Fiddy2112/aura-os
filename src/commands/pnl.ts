import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import { isAddress, formatUnits } from 'viem';
import { getCurrentChain } from '../core/blockchain/chains.js';
import { syncActivity } from '../core/utils/supabase.js';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TokenTx {
  hash:        string;
  timeStamp:   number;
  from:        string;
  to:          string;
  value:       bigint;
  tokenSymbol: string;
  tokenDecimal: number;
  contractAddress: string;
  isIn:        boolean;
  ethPrice?:   number;
}

interface TokenPosition {
  symbol:        string;
  contract:      string;
  totalIn:       number;
  totalOut:      number;
  netBalance:    number;
  costBasis:     number; // USD spent to acquire
  realizedPnl:   number; // USD from sells
  unrealizedPnl: number; // estimated (needs current price)
  txCount:       number;
}

// ── Etherscan fetch ───────────────────────────────────────────────────────────

async function fetchERC20Txs(address: string, apiKey: string, chainId: number): Promise<TokenTx[]> {
  const baseUrls: Record<number, string> = {
    1:     'https://api.etherscan.io/api',
    137:   'https://api.polygonscan.com/api',
    8453:  'https://api.basescan.org/api',
    10:    'https://api-optimistic.etherscan.io/api',
    42161: 'https://api.arbiscan.io/api',
    56:    'https://api.bscscan.com/api',
  };

  const baseUrl = baseUrls[chainId];
  if (!baseUrl) throw new Error(`Etherscan not configured for chain ${chainId}`);

  const res = await axios.get(baseUrl, {
    params: {
      module:  'account',
      action:  'tokentx',
      address,
      sort:    'asc',
      apikey:  apiKey,
    },
    timeout: 15000,
  });

  if (res.data.status === '0' && res.data.message !== 'No transactions found') {
    throw new Error(`Etherscan error: ${res.data.message}`);
  }

  return (res.data.result ?? []).map((tx: any) => ({
    hash:            tx.hash,
    timeStamp:       parseInt(tx.timeStamp),
    from:            tx.from.toLowerCase(),
    to:              tx.to.toLowerCase(),
    value:           BigInt(tx.value),
    tokenSymbol:     tx.tokenSymbol,
    tokenDecimal:    parseInt(tx.tokenDecimal),
    contractAddress: tx.contractAddress.toLowerCase(),
    isIn:            tx.to.toLowerCase() === address.toLowerCase(),
  }));
}

// ── CoinGecko price ───────────────────────────────────────────────────────────

const PRICE_CACHE = new Map<string, number>();

async function getTokenPrice(symbol: string): Promise<number> {
  const lower = symbol.toLowerCase();
  if (PRICE_CACHE.has(lower)) return PRICE_CACHE.get(lower)!;

  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params:  { ids: lower, vs_currencies: 'usd' },
      timeout: 5000,
    });
    const price = res.data[lower]?.usd ?? 0;
    PRICE_CACHE.set(lower, price);
    return price;
  } catch { return 0; }
}

const SYMBOL_TO_COINGECKO: Record<string, string> = {
  'USDC': 'usd-coin', 'USDT': 'tether', 'DAI': 'dai',
  'WETH': 'ethereum', 'ETH':  'ethereum',
  'WBTC': 'wrapped-bitcoin', 'BTC': 'bitcoin',
  'LINK': 'chainlink', 'UNI':  'uniswap', 'AAVE': 'aave',
  'MATIC': 'matic-network', 'ARB': 'arbitrum', 'OP': 'optimism',
};

async function getCurrentPrice(symbol: string): Promise<number> {
  const id = SYMBOL_TO_COINGECKO[symbol.toUpperCase()] ?? symbol.toLowerCase();
  return getTokenPrice(id);
}

// ── P&L calculation ───────────────────────────────────────────────────────────

function calcPositions(txs: TokenTx[], address: string): TokenPosition[] {
  const positions = new Map<string, TokenPosition>();

  for (const tx of txs) {
    const key = tx.contractAddress;
    if (!positions.has(key)) {
      positions.set(key, {
        symbol:        tx.tokenSymbol,
        contract:      tx.contractAddress,
        totalIn:       0,
        totalOut:      0,
        netBalance:    0,
        costBasis:     0,
        realizedPnl:   0,
        unrealizedPnl: 0,
        txCount:       0,
      });
    }

    const pos = positions.get(key)!;
    const amt = parseFloat(formatUnits(tx.value, tx.tokenDecimal));
    pos.txCount++;

    if (tx.isIn) {
      pos.totalIn += amt;
    } else {
      pos.totalOut += amt;
    }

    pos.netBalance = pos.totalIn - pos.totalOut;
  }

  return Array.from(positions.values())
    .filter(p => p.txCount > 0)
    .sort((a, b) => b.txCount - a.txCount);
}

// ── Display ───────────────────────────────────────────────────────────────────

function pnlColor(val: number): string {
  if (val > 0)   return chalk.green(`+$${val.toFixed(2)}`);
  if (val < 0)   return chalk.red(`-$${Math.abs(val).toFixed(2)}`);
  return chalk.gray('$0.00');
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function pnlCommand(args: string[]): Promise<void> {
  const address  = args[0] as `0x${string}`;
  const jsonMode = args.includes('--json');
  const detailed = args.includes('--detail');

  if (!address || args[0] === '--help') {
    console.log(chalk.bold.cyan('\n  aura pnl <wallet-address> [--detail] [--json]\n'));
    console.log(chalk.gray('  Analyze token P&L and cost basis for any wallet.\n'));
    console.log(chalk.gray('  Requires ETHERSCAN_API_KEY in .env\n'));
    console.log(chalk.gray('  Options:'));
    console.log(chalk.gray('    --detail   Show per-token breakdown'));
    console.log(chalk.gray('    --json     Raw JSON output\n'));
    console.log(chalk.gray('  Example: aura pnl 0xd8dA6BF...\n'));
    return;
  }

  if (!isAddress(address)) { console.error(chalk.red('\n  Invalid address\n')); return; }

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    console.error(chalk.red('\n  ETHERSCAN_API_KEY not set. Run "aura setup" to configure.\n'));
    return;
  }

  const chain   = getCurrentChain();
  const spinner = ora(chalk.cyan(' Fetching transaction history...')).start();

  try {
    const txs = await fetchERC20Txs(address.toLowerCase(), apiKey, chain.id);
    spinner.text = chalk.cyan(` Found ${txs.length} token txs — calculating P&L...`);

    const positions = calcPositions(txs, address.toLowerCase());

    // Fetch current prices
    const priceSpinner = ora(chalk.cyan(' Fetching current prices...')).start();
    const priceMap = new Map<string, number>();
    const uniqueSymbols = [...new Set(positions.map(p => p.symbol))];

    await Promise.allSettled(
      uniqueSymbols.map(async (sym) => {
        const price = await getCurrentPrice(sym);
        if (price > 0) priceMap.set(sym, price);
      })
    );
    priceSpinner.stop();

    // Attach unrealized PnL estimates
    for (const pos of positions) {
      const price = priceMap.get(pos.symbol) ?? 0;
      pos.unrealizedPnl = price > 0 ? pos.netBalance * price : 0;
    }

    spinner.stop();

    if (jsonMode) {
      console.log(JSON.stringify(positions, null, 2));
      return;
    }

    const divider = chalk.gray('─'.repeat(66));

    console.log(chalk.bold.cyan(`\n  P&L Analysis: ${address.slice(0, 10)}...${address.slice(-6)}`));
    console.log(chalk.gray(`  ${txs.length} token transactions across ${positions.length} tokens  [${chain.name}]`));
    console.log(divider);
    console.log(
      chalk.gray('  Token'.padEnd(10)) +
      chalk.gray('Balance'.padEnd(16)) +
      chalk.gray('Price'.padEnd(12)) +
      chalk.gray('Value'.padEnd(14)) +
      chalk.gray('Txs'),
    );
    console.log(divider);

    let totalValue = 0;
    for (const pos of positions.slice(0, 20)) {
      const price = priceMap.get(pos.symbol) ?? 0;
      const value = pos.netBalance * price;
      totalValue += value;

      const balFmt   = pos.netBalance > 0
        ? chalk.white(pos.netBalance >= 1e6 ? `${(pos.netBalance/1e6).toFixed(2)}M`
            : pos.netBalance >= 1000 ? `${(pos.netBalance/1000).toFixed(2)}K`
            : pos.netBalance.toFixed(4))
        : chalk.gray('0');

      const priceFmt = price > 0 ? chalk.gray(`$${price < 0.01 ? price.toExponential(2) : price.toFixed(2)}`) : chalk.gray('—');
      const valueFmt = value > 0 ? chalk.yellow(`$${value.toFixed(2)}`) : chalk.gray('—');

      console.log(
        `  ${chalk.cyan(pos.symbol.slice(0,8).padEnd(10))}` +
        `${balFmt.padEnd(16)}` +
        `${priceFmt.padEnd(12)}` +
        `${valueFmt.padEnd(14)}` +
        chalk.gray(pos.txCount),
      );

      if (detailed) {
        console.log(chalk.gray(`    In: ${pos.totalIn.toFixed(4)}  Out: ${pos.totalOut.toFixed(4)}`));
      }
    }

    if (positions.length > 20) {
      console.log(chalk.gray(`  ... and ${positions.length - 20} more tokens`));
    }

    console.log(divider);
    console.log(`  ${chalk.gray('Est. Portfolio Value:')} ${chalk.bold.yellow(`$${totalValue.toFixed(2)}`)}`);
    console.log(chalk.gray('\n  Note: Values are estimates based on current prices. Cost basis tracking'));
    console.log(chalk.gray('  requires historical price data. Use --detail for per-token breakdown.\n'));

    await syncActivity('PNL', { address }, `${positions.length} tokens, est. $${totalValue.toFixed(2)}`);

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`\n  Error: ${error instanceof Error ? error.message : String(error)}\n`));
  }
}