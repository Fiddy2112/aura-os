import chalk from 'chalk';
import { isAddress, formatEther, formatUnits } from 'viem';
import { getPublicClient } from '../core/blockchain/chains.js';
import { syncActivity } from '../core/utils/supabase.js';

// Common ERC-20 tokens to check per chain (extend as needed)
const TRACKED_TOKENS: Array<{ symbol: string; address: `0x${string}`; decimals: number }> = [
  { symbol: 'USDC',  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6  },
  { symbol: 'USDT',  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6  },
  { symbol: 'WETH',  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  { symbol: 'DAI',   address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
  { symbol: 'WBTC',  address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8  },
  { symbol: 'LINK',  address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 },
  { symbol: 'UNI',   address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
];

const BALANCE_OF_ABI = [{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs:  [{ name: 'account', type: 'address' }],
  outputs: [{ type: 'uint256' }],
}] as const;

// Simple price oracle via CoinGecko public API (no key required)
async function fetchPrice(symbol: string): Promise<number> {
  const idMap: Record<string, string> = {
    ETH: 'ethereum', WETH: 'weth', USDC: 'usd-coin', USDT: 'tether',
    DAI: 'dai', WBTC: 'wrapped-bitcoin', LINK: 'chainlink', UNI: 'uniswap',
  };
  const id = idMap[symbol];
  if (!id) return 0;

  try {
    const res  = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
    const data = await res.json() as Record<string, { usd: number }>;
    return data[id]?.usd ?? 0;
  } catch {
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function trackCommand(args: string[]) {
  const address   = args[0];
  const alertFlag = args.find(a => a.startsWith('--alert='));
  const alertUSD  = alertFlag ? parseFloat(alertFlag.split('=')[1]) : null;
  const jsonMode  = args.includes('--json');

  if (!address) {
    console.error(chalk.red('\n  Error: Wallet address is required'));
    console.log(chalk.gray('  Usage: aura track <address> [--alert=1000] [--json]\n'));
    process.exit(1);
  }

  if (!isAddress(address)) {
    console.error(chalk.red(`\n  Error: Invalid address: ${address}\n`));
    process.exit(1);
  }

  const client = getPublicClient();
  console.log(chalk.gray(`\n Fetching portfolio for ${address.slice(0, 10)}...`));

  try {
    // ── ETH balance ───────────────────────────────────────────────────────
    const ethBal  = await client.getBalance({ address: address as `0x${string}` });
    const ethAmt  = parseFloat(formatEther(ethBal));
    const ethPrice = await fetchPrice('ETH');
    const ethUSD  = ethAmt * ethPrice;

    const holdings: Array<{ symbol: string; balance: number; usd: number }> = [];
    if (ethAmt > 0) holdings.push({ symbol: 'ETH', balance: ethAmt, usd: ethUSD });

    // ── ERC-20 balances ───────────────────────────────────────────────────
    const tokenResults = await Promise.allSettled(
      TRACKED_TOKENS.map(t =>
        client.readContract({
          address: t.address,
          abi: BALANCE_OF_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        }).then(async raw => {
          const bal = parseFloat(formatUnits(raw as bigint, t.decimals));
          if (bal < 0.0001) return null;
          const price = await fetchPrice(t.symbol);
          return { symbol: t.symbol, balance: bal, usd: bal * price };
        })
      )
    );

    for (const r of tokenResults) {
      if (r.status === 'fulfilled' && r.value) holdings.push(r.value);
    }

    holdings.sort((a, b) => b.usd - a.usd);
    const totalUSD = holdings.reduce((s, h) => s + h.usd, 0);

    // ── JSON ──────────────────────────────────────────────────────────────
    if (jsonMode) {
      console.log(JSON.stringify({ address, totalUSD, holdings }, null, 2));
      return;
    }

    // ── Display ───────────────────────────────────────────────────────────
    const divider = '─'.repeat(52);
    console.log(chalk.bold.cyan(`\n💼 Portfolio Tracker`));
    console.log(chalk.gray(` ${address}`));
    console.log(chalk.gray(divider));
    console.log(
      chalk.gray(' Token'.padEnd(8)) +
      chalk.gray('Balance'.padStart(18)) +
      chalk.gray('USD Value'.padStart(14))
    );
    console.log(chalk.gray(divider));

    if (holdings.length === 0) {
      console.log(chalk.yellow('\n No token balances found.\n'));
    } else {
      for (const h of holdings) {
        const balStr = h.balance.toLocaleString(undefined, { maximumFractionDigits: 4 });
        const usdStr = `$${h.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
        console.log(
          chalk.white(` ${h.symbol.padEnd(7)}`) +
          chalk.white(balStr.padStart(17)) +
          chalk.green(usdStr.padStart(14))
        );
      }

      console.log(chalk.gray(divider));
      console.log(
        chalk.bold.white(' TOTAL'.padEnd(25)) +
        chalk.bold.green(`$${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.padStart(14))
      );
    }

    console.log('');

    // ── Alert ─────────────────────────────────────────────────────────────
    if (alertUSD !== null && totalUSD < alertUSD) {
      console.log(chalk.red.bold(` ⚠️  ALERT: Portfolio below threshold!`));
      console.log(chalk.red(` Current: $${totalUSD.toFixed(2)}  |  Threshold: $${alertUSD}\n`));
    }

    await syncActivity('TRACK', { address }, `Portfolio: $${totalUSD.toFixed(2)}`);

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  Error: ${msg}\n`));
    process.exit(1);
  }
}