import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';

// ── CoinGecko ID map for common tickers ───────────────────────────────────────

const TICKER_TO_ID: Record<string, string> = {
  btc: 'bitcoin', bitcoin: 'bitcoin',
  eth: 'ethereum', ethereum: 'ethereum',
  bnb: 'binancecoin',
  sol: 'solana', solana: 'solana',
  usdt: 'tether',
  usdc: 'usd-coin',
  xrp: 'ripple',
  ada: 'cardano',
  avax: 'avalanche-2',
  dot: 'polkadot',
  matic: 'matic-network', pol: 'matic-network',
  link: 'chainlink',
  uni: 'uniswap',
  arb: 'arbitrum',
  op: 'optimism',
  atom: 'cosmos',
  near: 'near',
  apt: 'aptos',
  sui: 'sui',
  ton: 'the-open-network',
  pepe: 'pepe',
  shib: 'shiba-inu',
  doge: 'dogecoin',
  wbtc: 'wrapped-bitcoin',
  steth: 'staked-ether',
  dai: 'dai',
};

// ── ASCII sparkline ───────────────────────────────────────────────────────────

const SPARK_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

function sparkline(prices: number[]): string {
  if (prices.length < 2) return '';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  return prices
    .map(p => {
      const idx = Math.round(((p - min) / range) * (SPARK_CHARS.length - 1));
      return SPARK_CHARS[idx];
    })
    .join('');
}

function colorSpark(spark: string, change: number): string {
  return change >= 0 ? chalk.green(spark) : chalk.red(spark);
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatPrice(usd: number): string {
  if (usd >= 1000)   return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (usd >= 1)      return `$${usd.toFixed(4)}`;
  if (usd >= 0.0001) return `$${usd.toFixed(6)}`;
  return `$${usd.toExponential(4)}`;
}

function formatChange(pct: number): string {
  const sign  = pct >= 0 ? '+' : '';
  const color = pct >= 0 ? chalk.green : chalk.red;
  return color(`${sign}${pct.toFixed(2)}%`);
}

function formatLarge(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

// ── Resolve token → CoinGecko ID ──────────────────────────────────────────────

function resolveId(input: string): string {
  const lower = input.toLowerCase().trim();
  return TICKER_TO_ID[lower] ?? lower; // fallback: treat as CoinGecko ID directly
}

// ── Fetch data ────────────────────────────────────────────────────────────────

interface CoinData {
  id:     string;
  symbol: string;
  name:   string;
  market_data: {
    current_price:            { usd: number };
    price_change_percentage_1h_in_currency:  { usd: number };
    price_change_percentage_24h:             number;
    price_change_percentage_7d:              number;
    market_cap:               { usd: number };
    total_volume:             { usd: number };
    circulating_supply:       number;
    ath:                      { usd: number };
    ath_change_percentage:    { usd: number };
  };
  sparkline_in_7d: { price: number[] };
}

async function fetchCoinData(id: string): Promise<CoinData> {
  const url = `https://api.coingecko.com/api/v3/coins/${id}`;
  const res  = await axios.get(url, {
    params: {
      localization:          false,
      tickers:               false,
      market_data:           true,
      community_data:        false,
      developer_data:        false,
      sparkline:             true,
    },
    timeout: 8000,
    headers: { 'Accept': 'application/json' },
  });
  return res.data;
}

// ── Display ───────────────────────────────────────────────────────────────────

function display(coin: CoinData, showChart: boolean): void {
  const md      = coin.market_data;
  const price   = md.current_price.usd;
  const ch1h    = md.price_change_percentage_1h_in_currency?.usd ?? 0;
  const ch24h   = md.price_change_percentage_24h ?? 0;
  const ch7d    = md.price_change_percentage_7d  ?? 0;
  const cap     = md.market_cap.usd;
  const vol     = md.total_volume.usd;
  const supply  = md.circulating_supply;
  const ath     = md.ath.usd;
  const athDiff = md.ath_change_percentage.usd;

  const spark = sparkline(coin.sparkline_in_7d?.price ?? []);

  const divider = chalk.gray('─'.repeat(46));

  console.log(chalk.bold.cyan(`\n  ${coin.name} ${chalk.gray(`(${coin.symbol.toUpperCase()})`)}`));
  console.log(divider);

  console.log(`  ${chalk.bold.white('Price:  ')} ${chalk.bold.yellow(formatPrice(price))}`);
  console.log(`  ${chalk.gray('1h:     ')} ${formatChange(ch1h)}    ${chalk.gray('24h:')} ${formatChange(ch24h)}    ${chalk.gray('7d:')} ${formatChange(ch7d)}`);
  console.log(divider);

  console.log(`  ${chalk.gray('Mkt Cap:')}  ${chalk.white(formatLarge(cap))}`);
  console.log(`  ${chalk.gray('Volume: ')}  ${chalk.white(formatLarge(vol))}`);
  if (supply) {
    console.log(`  ${chalk.gray('Supply: ')}  ${chalk.white(supply.toLocaleString('en-US'))} ${coin.symbol.toUpperCase()}`);
  }
  console.log(`  ${chalk.gray('ATH:    ')}  ${chalk.white(formatPrice(ath))}  ${formatChange(athDiff)}`);

  if (spark && showChart) {
    console.log(divider);
    console.log(`  ${chalk.gray('7d chart:')} ${colorSpark(spark, ch7d)}`);
  }

  console.log('');
}

// ── Multi-token display ───────────────────────────────────────────────────────

async function fetchSimple(ids: string[]): Promise<void> {
  const res = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
    params: {
      ids:                ids.join(','),
      vs_currencies:      'usd',
      include_24hr_change: true,
      include_market_cap:  true,
    },
    timeout: 8000,
  });

  const data = res.data;
  const labelW = Math.max(...ids.map(id => id.length)) + 2;

  console.log(chalk.bold.cyan('\n  Token Prices\n'));
  console.log(chalk.gray(`  ${'Token'.padEnd(labelW)}  ${'Price'.padEnd(14)}  24h Change`));
  console.log(chalk.gray('  ' + '─'.repeat(44)));

  for (const id of ids) {
    const d = data[id];
    if (!d) {
      console.log(`  ${chalk.red(id.padEnd(labelW))}  ${chalk.gray('Not found')}`);
      continue;
    }
    const price  = formatPrice(d.usd).padEnd(14);
    const change = formatChange(d.usd_24h_change ?? 0);
    console.log(`  ${chalk.white(id.padEnd(labelW))}  ${chalk.yellow(price)}  ${change}`);
  }

  console.log('');
}

// ── Command entry point ───────────────────────────────────────────────────────

export async function priceCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(chalk.bold.cyan('\n  aura price <token> [token2 ...] [--chart]\n'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura price eth'));
    console.log(chalk.gray('    aura price btc eth sol'));
    console.log(chalk.gray('    aura price eth --chart\n'));
    return;
  }

  const showChart = args.includes('--chart');
  const tokens    = args.filter(a => !a.startsWith('--'));

  const spinner = ora(chalk.cyan(' Fetching prices...')).start();

  try {
    if (tokens.length === 1) {
      // Full detail view for single token
      const id   = resolveId(tokens[0]);
      const coin = await fetchCoinData(id);
      spinner.stop();
      display(coin, showChart || true); // always show chart for single token
    } else {
      // Table view for multiple tokens
      const ids = tokens.map(resolveId);
      await fetchSimple(ids);
      spinner.stop();
    }
  } catch (error) {
    spinner.stop();
    const msg = error instanceof Error ? error.message : String(error);

    if (msg.includes('404') || msg.includes('not found')) {
      console.error(chalk.red(`\n  Token not found. Try the CoinGecko ID (e.g. "aura price ethereum")\n`));
    } else if (msg.includes('429')) {
      console.error(chalk.red(`\n  Rate limited by CoinGecko. Wait a moment and try again.\n`));
    } else {
      console.error(chalk.red(`\n  Error: ${msg}\n`));
    }
  }
}