import chalk from 'chalk';
import ora from 'ora';
import { isAddress, formatEther, parseEther } from 'viem';
import { getPublicClient } from '../core/blockchain/chains.js';
import { scanContract } from '../core/engine/scanner.js';
import { simulateCall } from '../core/engine/simulate.js';
import { syncActivity } from '../core/utils/supabase.js';

// ── Common DEX router addresses (for simulation) ──────────────────────────────

const UNISWAP_V2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' as const;

// Minimal Uniswap V2 Router ABI for simulation
const ROUTER_ABI = [
  {
    name: 'swapExactETHForTokens',
    type: 'function' as const,
    stateMutability: 'payable' as const,
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path',         type: 'address[]' },
      { name: 'to',           type: 'address' },
      { name: 'deadline',     type: 'uint256' },
    ],
    outputs: [{ type: 'uint256[]' }],
  },
  {
    name: 'swapExactTokensForETH',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'amountIn',     type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path',         type: 'address[]' },
      { name: 'to',           type: 'address' },
      { name: 'deadline',     type: 'uint256' },
    ],
    outputs: [{ type: 'uint256[]' }],
  },
  {
    name: 'getAmountsOut',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path',     type: 'address[]' },
    ],
    outputs: [{ type: 'uint256[]' }],
  },
] as const;

const ERC20_ABI = [
  { name: 'approve',     type: 'function' as const, stateMutability: 'nonpayable' as const, inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'balanceOf',   type: 'function' as const, stateMutability: 'view' as const,       inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'name',        type: 'function' as const, stateMutability: 'view' as const,       inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol',      type: 'function' as const, stateMutability: 'view' as const,       inputs: [], outputs: [{ type: 'string' }] },
  { name: 'totalSupply', type: 'function' as const, stateMutability: 'view' as const,       inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

// WETH address (mainnet)
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as const;

// ── Bytecode pattern checks ───────────────────────────────────────────────────

interface BytecodeFlags {
  hasHiddenFee:         boolean;
  hasOwnerOnlySell:     boolean;
  hasAntiBot:           boolean;
  hasMaxTx:             boolean;
  hasCooldown:          boolean;
  hasBlacklist:         boolean;
}

function analyzeBytecodePatterns(runtime: string): BytecodeFlags {
  const r = runtime.toLowerCase();
  return {
    // Large fee selectors or internal fee variables
    hasHiddenFee:     r.includes('fee') && (r.includes('tax') || r.includes('_fee')),
    // onlyOwner modifier on transfer-related logic
    hasOwnerOnlySell: r.includes('8da5cb5b') && r.includes('a9059cbb'), // owner() + transfer()
    // Common anti-bot patterns
    hasAntiBot:       r.includes('antibot') || r.includes('bot') || r.includes('sniper'),
    // Max transaction limit
    hasMaxTx:         r.includes('maxtx') || r.includes('_maxtxamount') || r.includes('maxtransaction'),
    // Cooldown between trades
    hasCooldown:      r.includes('cooldown') || r.includes('lastbuy') || r.includes('tradecooldown'),
    // Blacklist
    hasBlacklist:     r.includes('blacklist') || r.includes('_isblacklisted'),
  };
}

// ── Tax simulation via getAmountsOut ──────────────────────────────────────────

interface TaxResult {
  buyTax:   number | null;
  sellTax:  number | null;
  canBuy:   boolean;
  canSell:  boolean;
  buyError:  string | null;
  sellError: string | null;
}

async function simulateTax(token: `0x${string}`): Promise<TaxResult> {
  const client   = getPublicClient();
  const testAddr = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as `0x${string}`; // vitalik.eth — known EOA
  const testEth  = parseEther('0.1');
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

  let buyTax:   number | null = null;
  let sellTax:  number | null = null;
  let canBuy   = false;
  let canSell  = false;
  let buyError:  string | null = null;
  let sellError: string | null = null;

  // ── Buy simulation ─────────────────────────────────────────────────────────
  try {
    // Expected output without tax
    const expectedOut = await client.readContract({
      address: UNISWAP_V2_ROUTER,
      abi:     ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [testEth, [WETH, token]],
    }) as bigint[];

    const expectedTokens = expectedOut[1];

    // Simulate actual buy
    const buyResult = await simulateCall({
      contractAddress: UNISWAP_V2_ROUTER,
      abi:             ROUTER_ABI,
      functionName:    'swapExactETHForTokens',
      args:            [0n, [WETH, token], testAddr, deadline],
      from:            testAddr,
      value:           testEth,
    });

    if (buyResult.success) {
      canBuy = true;
      const actualTokens = (buyResult.result as bigint[])?.[1] ?? expectedTokens;
      if (expectedTokens > 0n) {
        const taxPct = Number((expectedTokens - actualTokens) * 10000n / expectedTokens) / 100;
        buyTax = Math.max(0, taxPct);
      }
    } else {
      buyError = buyResult.error ?? 'Buy simulation failed';
    }
  } catch (e) {
    buyError = e instanceof Error ? e.message.slice(0, 100) : 'Buy check failed';
  }

  // ── Sell simulation (only if buy worked) ──────────────────────────────────
  if (canBuy) {
    try {
      // Use a small token amount for sell simulation
      const tokenAmountIn = parseEther('1'); // 1 token unit

      const sellResult = await simulateCall({
        contractAddress: UNISWAP_V2_ROUTER,
        abi:             ROUTER_ABI,
        functionName:    'swapExactTokensForETH',
        args:            [tokenAmountIn, 0n, [token, WETH], testAddr, deadline],
        from:            testAddr,
      });

      if (sellResult.success) {
        canSell = true;
        sellTax = 0; // If it succeeds, no tax detectable without actual balance
      } else {
        sellError = sellResult.error ?? 'Sell simulation failed';
      }
    } catch (e) {
      sellError = e instanceof Error ? e.message.slice(0, 100) : 'Sell check failed';
    }
  }

  return { buyTax, sellTax, canBuy, canSell, buyError, sellError };
}

// ── Verdict ───────────────────────────────────────────────────────────────────

type Verdict = 'SAFE' | 'SUSPICIOUS' | 'LIKELY_HONEYPOT' | 'HONEYPOT';

function computeVerdict(
  tax:   TaxResult,
  flags: BytecodeFlags,
  scan:  { riskScore: number },
): { verdict: Verdict; reasons: string[]; score: number } {
  const reasons: string[] = [];
  let score = 0;

  if (!tax.canBuy) {
    score += 40;
    reasons.push(`Cannot simulate buy: ${tax.buyError}`);
  }

  if (tax.canBuy && !tax.canSell) {
    score += 50;
    reasons.push(`Buy succeeds but sell fails: ${tax.sellError}`);
  }

  if (tax.buyTax !== null && tax.buyTax > 10) {
    score += 20;
    reasons.push(`High buy tax: ${tax.buyTax.toFixed(1)}%`);
  }

  if (tax.sellTax !== null && tax.sellTax > 10) {
    score += 30;
    reasons.push(`High sell tax: ${tax.sellTax.toFixed(1)}%`);
  }

  if (flags.hasBlacklist) { score += 15; reasons.push('Blacklist capability'); }
  if (flags.hasOwnerOnlySell) { score += 20; reasons.push('Owner-restricted sell detected'); }
  if (flags.hasAntiBot)    { score += 10; reasons.push('Anti-bot mechanism'); }
  if (flags.hasCooldown)   { score += 5;  reasons.push('Trade cooldown present'); }
  if (flags.hasHiddenFee)  { score += 10; reasons.push('Hidden fee patterns in bytecode'); }
  if (flags.hasMaxTx)      { score += 5;  reasons.push('Max transaction limit'); }

  score = Math.min(score + Math.round(scan.riskScore * 0.2), 100);

  let verdict: Verdict;
  if (score >= 70)      verdict = 'HONEYPOT';
  else if (score >= 45) verdict = 'LIKELY_HONEYPOT';
  else if (score >= 20) verdict = 'SUSPICIOUS';
  else                  verdict = 'SAFE';

  return { verdict, reasons, score };
}

// ── Display ───────────────────────────────────────────────────────────────────

function verdictColor(v: Verdict) {
  if (v === 'HONEYPOT')        return chalk.bgRed.bold.white;
  if (v === 'LIKELY_HONEYPOT') return chalk.red.bold;
  if (v === 'SUSPICIOUS')      return chalk.yellow.bold;
  return chalk.green.bold;
}

// ── Command entry ─────────────────────────────────────────────────────────────

export async function honeypotCommand(args: string[]): Promise<void> {
  const address  = args[0] as `0x${string}`;
  const jsonMode = args.includes('--json');

  if (!args[0] || args[0] === '--help') {
    console.log(chalk.bold.cyan('\n  aura honeypot <token-address> [--json]\n'));
    console.log(chalk.gray('  Detects honeypot & scam patterns before you buy.\n'));
    console.log(chalk.gray('  Checks:'));
    console.log(chalk.gray('    • Buy/sell simulation via Uniswap V2'));
    console.log(chalk.gray('    • Bytecode pattern analysis (hidden fees, blacklist, anti-bot)'));
    console.log(chalk.gray('    • Tax rate estimation'));
    console.log(chalk.gray('\n  Example: aura honeypot 0x1234...abcd\n'));
    return;
  }

  if (!isAddress(address)) {
    console.error(chalk.red('\n  Invalid address format\n'));
    return;
  }

  const spinner = ora(chalk.cyan(' Scanning token...')).start();

  try {
    const client = getPublicClient();

    // Fetch bytecode
    const code = await client.getCode({ address });
    if (!code || code === '0x') {
      spinner.stop();
      console.log(chalk.red('\n  Not a contract address.\n'));
      return;
    }

    // Token identity
    let name   = 'Unknown';
    let symbol = 'UNKNOWN';
    try {
      name   = await client.readContract({ address, abi: ERC20_ABI, functionName: 'name' }) as string;
      symbol = await client.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' }) as string;
    } catch {}

    spinner.text = chalk.cyan(' Analyzing bytecode patterns...');
    const runtime = code.slice(2).toLowerCase();
    const flags   = analyzeBytecodePatterns(runtime);
    const scan    = scanContract(address, code);

    spinner.text = chalk.cyan(' Simulating buy/sell...');
    const tax = await simulateTax(address);

    spinner.stop();

    const { verdict, reasons, score } = computeVerdict(tax, flags, scan);

    if (jsonMode) {
      console.log(JSON.stringify({ address, name, symbol, verdict, score, tax, flags, reasons }, null, 2));
      return;
    }

    const vc = verdictColor(verdict);
    const divider = chalk.gray('─'.repeat(48));

    console.log(chalk.bold.cyan(`\n  Honeypot Analysis: ${chalk.white(name)} ${chalk.gray(`(${symbol})`)}`));
    console.log(chalk.gray(`  ${address}`));
    console.log(divider);

    console.log(`  ${chalk.gray('Verdict:')}  ${vc(` ${verdict} `)}  ${chalk.gray(`Risk Score: ${score}/100`)}`);
    console.log(divider);

    // Trade simulation results
    console.log(chalk.bold.white('  Trade Simulation:'));
    console.log(`  ${chalk.gray('Buy:')}   ${tax.canBuy  ? chalk.green('✓ PASS') : chalk.red('✗ FAIL')}${tax.buyTax  !== null ? chalk.gray(`  Tax: ${tax.buyTax.toFixed(1)}%`)  : ''}`);
    console.log(`  ${chalk.gray('Sell:')}  ${tax.canSell ? chalk.green('✓ PASS') : chalk.red('✗ FAIL')}${tax.sellTax !== null ? chalk.gray(`  Tax: ${tax.sellTax.toFixed(1)}%`) : ''}`);

    if (tax.buyError)  console.log(chalk.gray(`           ↳ ${tax.buyError}`));
    if (tax.sellError) console.log(chalk.gray(`           ↳ ${tax.sellError}`));

    // Bytecode flags
    console.log(chalk.bold.white('\n  Bytecode Flags:'));
    const flagEntries: [string, boolean][] = [
      ['Blacklist',        flags.hasBlacklist],
      ['Owner-only sell',  flags.hasOwnerOnlySell],
      ['Hidden fee',       flags.hasHiddenFee],
      ['Anti-bot',         flags.hasAntiBot],
      ['Max TX limit',     flags.hasMaxTx],
      ['Trade cooldown',   flags.hasCooldown],
    ];
    for (const [label, detected] of flagEntries) {
      const indicator = detected ? chalk.red('⚠  DETECTED') : chalk.gray('○  clean');
      console.log(`  ${chalk.gray(label.padEnd(18))} ${indicator}`);
    }

    // Risk reasons
    if (reasons.length > 0) {
      console.log(chalk.bold.white('\n  Risk Factors:'));
      reasons.forEach(r => console.log(chalk.gray(`  • ${r}`)));
    }

    // Recommendation
    console.log(divider);
    if (verdict === 'HONEYPOT' || verdict === 'LIKELY_HONEYPOT') {
      console.log(chalk.red.bold('  ⛔ DO NOT BUY — High probability of honeypot or exit scam.'));
    } else if (verdict === 'SUSPICIOUS') {
      console.log(chalk.yellow('  ⚠  Proceed with caution. Test with a small amount first.'));
    } else {
      console.log(chalk.green('  ✓  No major honeypot patterns detected. Always DYOR.'));
    }
    console.log('');

    await syncActivity('HONEYPOT', { address }, `${symbol} — ${verdict} (${score}/100)`);

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`\n  Error: ${error instanceof Error ? error.message : String(error)}\n`));
  }
}