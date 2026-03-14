import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import axios from 'axios';
import { isAddress, parseUnits, formatUnits, createWalletClient, http, maxUint256 } from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { getPublicClient, getCurrentChain } from '../core/blockchain/chains.js';
import { Vault } from '../core/security/vault.js';
import { syncActivity } from '../core/utils/supabase.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ── 1inch API key helper ──────────────────────────────────────────────────────

const ONEINCH_PORTAL = 'https://portal.1inch.dev';
const CONFIG_ENV     = path.join(os.homedir(), '.config', 'aura-os', '.env');

function upsertEnvKey(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*`, 'm');
  return regex.test(content)
    ? content.replace(regex, `${key}=${value}`)
    : content + `\n${key}=${value}`;
}

async function promptForApiKey(): Promise<string | null> {
  console.log(chalk.yellow('\n  1inch API key not found.\n'));
  console.log(chalk.gray('  Get a free key at:'));
  console.log(chalk.bold.cyan(`  ${ONEINCH_PORTAL}\n`));

  // Try to open browser
  try {
    const { execSync } = await import('child_process');
    const cmd = process.platform === 'darwin' ? 'open'
      : process.platform === 'win32'  ? 'start'
      : 'xdg-open';
    execSync(`${cmd} ${ONEINCH_PORTAL}`, { stdio: 'ignore' });
    console.log(chalk.gray('  Browser opened. Sign up → Developer Portal → Create API key.\n'));
  } catch {
    console.log(chalk.gray('  Copy the URL above into your browser to get a key.\n'));
  }

  const { proceed } = await inquirer.prompt([{
    type: 'confirm', name: 'proceed',
    message: chalk.cyan(' Enter your 1inch API key now?'),
    default: true,
  }]);

  if (!proceed) {
    console.log(chalk.gray('\n  Skipped. Add ONEINCH_API_KEY to ~/.config/aura-os/.env manually.\n'));
    return null;
  }

  const { apiKey } = await inquirer.prompt([{
    type: 'password', name: 'apiKey',
    message: chalk.cyan(' Paste your 1inch API key:'),
    validate: (v: string) => v.trim().length > 10 ? true : 'Key looks too short',
  }]);

  const key = apiKey.trim();

  // Persist to ~/.config/aura-os/.env
  let content = fs.existsSync(CONFIG_ENV) ? fs.readFileSync(CONFIG_ENV, 'utf8') : '';
  content     = upsertEnvKey(content, 'ONEINCH_API_KEY', key);
  fs.writeFileSync(CONFIG_ENV, content.trim() + '\n');
  process.env.ONEINCH_API_KEY = key; // apply immediately for this session

  console.log(chalk.green('  ✓ Key saved to ~/.config/aura-os/.env\n'));
  return key;
}

function getApiKey(): string | undefined {
  return process.env.ONEINCH_API_KEY;
}

function getHeaders(apiKey?: string): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

// ── Token registry ────────────────────────────────────────────────────────────

const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

const TOKEN_ADDRESSES: Record<string, `0x${string}`> = {
  usdc:  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  usdt:  '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  dai:   '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  weth:  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  wbtc:  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  link:  '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  uni:   '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  aave:  '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  pepe:  '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
  shib:  '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
};

const TOKEN_DECIMALS: Record<string, number> = {
  usdc: 6, usdt: 6, wbtc: 8,
};

function resolveToken(symbol: string): { address: string; decimals: number } {
  if (symbol.toUpperCase() === 'ETH') return { address: NATIVE_TOKEN, decimals: 18 };
  if (isAddress(symbol)) return { address: symbol, decimals: 18 };
  const lower = symbol.toLowerCase();
  return {
    address:  TOKEN_ADDRESSES[lower] ?? symbol,
    decimals: TOKEN_DECIMALS[lower]  ?? 18,
  };
}

// ── 1inch API ─────────────────────────────────────────────────────────────────

const ONEINCH_BASE = 'https://api.1inch.dev/swap/v6.0';

interface SwapQuote {
  fromAmount:  string;
  toAmount:    string;
  toAmountMin: string;
  gas:         number;
  protocols:   string[];
}

async function getQuote(
  chainId:  number,
  src:      string,
  dst:      string,
  amount:   string,
  slippage: number,
  apiKey?:  string,
): Promise<SwapQuote> {
  const res = await axios.get(`${ONEINCH_BASE}/${chainId}/quote`, {
    params:  { src, dst, amount, includeProtocols: true },
    headers: getHeaders(apiKey),
    timeout: 10000,
  });

  const d           = res.data;
  const toAmount    = d.dstAmount ?? d.toAmount ?? '0';
  const slippageMul = 10000n - BigInt(Math.round(slippage * 100));
  const toAmountMin = (BigInt(toAmount) * slippageMul / 10000n).toString();

  const protocols: string[] = [];
  try {
    const protos = d.protocols?.[0];
    if (Array.isArray(protos)) {
      protos.flat(2).forEach((p: any) => { if (p?.name) protocols.push(p.name); });
    }
  } catch {}

  return {
    fromAmount: amount,
    toAmount,
    toAmountMin,
    gas:       d.gas ?? d.estimatedGas ?? 0,
    protocols: [...new Set(protocols)].slice(0, 4),
  };
}

interface SwapTx {
  to:    `0x${string}`;
  data:  `0x${string}`;
  value: string;
  gas:   number;
}

async function getSwapTx(
  chainId:  number,
  src:      string,
  dst:      string,
  amount:   string,
  from:     string,
  slippage: number,
  apiKey?:  string,
): Promise<SwapTx> {
  const res = await axios.get(`${ONEINCH_BASE}/${chainId}/swap`, {
    params:  { src, dst, amount, from, slippage, disableEstimate: false, allowPartialFill: false },
    headers: getHeaders(apiKey),
    timeout: 10000,
  });

  const tx = res.data.tx;
  return {
    to:    tx.to    as `0x${string}`,
    data:  tx.data  as `0x${string}`,
    value: tx.value ?? '0',
    gas:   tx.gas   ?? 300000,
  };
}

// ── ERC-20 ABI + approve ──────────────────────────────────────────────────────

const ERC20_ABI = [
  { name: 'allowance', type: 'function' as const, stateMutability: 'view' as const,       inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve',   type: 'function' as const, stateMutability: 'nonpayable' as const, inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],  outputs: [{ type: 'bool' }] },
  { name: 'decimals',  type: 'function' as const, stateMutability: 'view' as const,       inputs: [], outputs: [{ type: 'uint8' }] },
] as const;

const ONEINCH_ROUTER = '0x111111125421cA6dc452d289314280a0f8842A65' as const;

async function ensureAllowance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletClient: any,
  publicClient: ReturnType<typeof getPublicClient>,
  token:        `0x${string}`,
  owner:        `0x${string}`,
  amount:       bigint,
  account:      PrivateKeyAccount,
): Promise<void> {
  const allowance = await publicClient.readContract({
    address: token, abi: ERC20_ABI, functionName: 'allowance',
    args: [owner, ONEINCH_ROUTER],
  }) as bigint;

  if (allowance >= amount) return;

  const approveSpinner = ora(chalk.cyan(' Approving token spend...')).start();
  const chain = getCurrentChain();

  const hash = await walletClient.writeContract({
    address:      token,
    abi:          ERC20_ABI,
    functionName: 'approve',
    args:         [ONEINCH_ROUTER, maxUint256],
    account,                        // required by viem v2
    chain:        chain.chain,      // required by viem v2 — must be Chain, not ChainConfig
  });

  await publicClient.waitForTransactionReceipt({ hash });
  approveSpinner.succeed(chalk.green(' ✓ Approval confirmed'));
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function swapCommand(args: string[]): Promise<void> {
  if (args.length < 3 || args[0] === '--help') {
    console.log(chalk.bold.cyan('\n  aura swap <amount> <from> <to> [--slippage <pct>]\n'));
    console.log(chalk.gray('  Swap tokens via 1inch best-route aggregator.\n'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura swap 0.1 ETH USDC'));
    console.log(chalk.gray('    aura swap 100 USDC DAI --slippage 0.5\n'));
    console.log(chalk.gray(`  Get a free 1inch API key: ${ONEINCH_PORTAL}\n`));
    return;
  }

  const slippageIdx = args.indexOf('--slippage');
  const slippage    = slippageIdx !== -1 ? parseFloat(args[slippageIdx + 1]) : 0.5;
  const cleanArgs   = args.filter((_, i) => i !== slippageIdx && i !== slippageIdx + 1);

  const [amountRaw, fromSymbol, toSymbol] = cleanArgs;
  const amount = parseFloat(amountRaw);

  if (isNaN(amount) || amount <= 0) { console.error(chalk.red('\n  Invalid amount\n')); return; }
  if (!Vault.isSetup())             { console.log(chalk.yellow('\n  Run "aura setup" first.\n')); return; }

  // ── Resolve/prompt API key ────────────────────────────────────────────────
  let apiKey = getApiKey();
  if (!apiKey) {
    apiKey = (await promptForApiKey()) ?? undefined;
    if (!apiKey) return; // user declined
  }

  const fromToken = resolveToken(fromSymbol);
  const toToken   = resolveToken(toSymbol);

  if (!fromToken.address) { console.error(chalk.red(`\n  Unknown token: ${fromSymbol}\n`)); return; }
  if (!toToken.address)   { console.error(chalk.red(`\n  Unknown token: ${toSymbol}\n`));   return; }

  // ── Unlock wallet ─────────────────────────────────────────────────────────
  const { masterPassword } = await inquirer.prompt([{
    type: 'password', name: 'masterPassword', message: chalk.cyan(' Master password:'),
  }]);
  const privateKey = Vault.getKey(masterPassword);
  if (!privateKey) { console.log(chalk.red(' Invalid password.\n')); return; }

  const account      = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}` as `0x${string}`);
  const chain        = getCurrentChain();
  const publicClient = getPublicClient();
  const walletClient = createWalletClient({ account, chain: chain.chain, transport: http() });

  // Resolve from-token decimals from chain
  let fromDecimals = fromToken.decimals;
  if (fromToken.address !== NATIVE_TOKEN) {
    try {
      fromDecimals = await publicClient.readContract({
        address: fromToken.address as `0x${string}`,
        abi: ERC20_ABI, functionName: 'decimals',
      }) as number;
    } catch {}
  }

  const amountWei = parseUnits(amountRaw, fromDecimals).toString();

  // ── Get quote ─────────────────────────────────────────────────────────────
  const quoteSpinner = ora(chalk.cyan(' Fetching best route...')).start();
  let quote: SwapQuote;
  try {
    quote = await getQuote(chain.id, fromToken.address, toToken.address, amountWei, slippage, apiKey);
    quoteSpinner.stop();
  } catch (e) {
    quoteSpinner.stop();
    const status = axios.isAxiosError(e) ? e.response?.status : null;

    if (status === 429) {
      console.error(chalk.red('\n  1inch rate limit exceeded.'));
      console.error(chalk.gray(`  Upgrade your plan at: ${ONEINCH_PORTAL}\n`));
    } else if (status === 401) {
      console.error(chalk.red('\n  1inch API key invalid. Run "aura swap" again to update it.\n'));
      // Clear bad key so next run re-prompts
      process.env.ONEINCH_API_KEY = '';
    } else {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('insufficient liquidity') || msg.includes('Not enough')) {
        console.error(chalk.red('\n  Insufficient liquidity for this pair/amount. Try a smaller amount.\n'));
      } else {
        console.error(chalk.red(`\n  Quote failed: ${msg.slice(0, 120)}\n`));
      }
    }
    return;
  }

  // Resolve to-token decimals
  let toDecimals = toToken.decimals;
  if (toToken.address !== NATIVE_TOKEN) {
    try {
      toDecimals = await publicClient.readContract({
        address: toToken.address as `0x${string}`,
        abi: ERC20_ABI, functionName: 'decimals',
      }) as number;
    } catch {}
  }

  const toAmountFmt    = parseFloat(formatUnits(BigInt(quote.toAmount),    toDecimals)).toFixed(6);
  const toAmountMinFmt = parseFloat(formatUnits(BigInt(quote.toAmountMin), toDecimals)).toFixed(6);

  console.log(chalk.bold.cyan('\n  Swap Quote (1inch):'));
  console.log(chalk.gray('  ' + '─'.repeat(44)));
  console.log(`  ${chalk.gray('Sell:     ')} ${chalk.yellow(amountRaw)} ${fromSymbol.toUpperCase()}`);
  console.log(`  ${chalk.gray('Buy:      ')} ${chalk.green(toAmountFmt)} ${toSymbol.toUpperCase()}`);
  console.log(`  ${chalk.gray('Min rcvd:')} ${chalk.white(toAmountMinFmt)} ${toSymbol.toUpperCase()} ${chalk.gray(`(${slippage}% slippage)`)}`);
  console.log(`  ${chalk.gray('Route:    ')} ${chalk.cyan(quote.protocols.join(' → ') || '1inch')}`);
  console.log(`  ${chalk.gray('Est gas:  ')} ${chalk.white(quote.gas.toLocaleString())}\n`);

  const { confirmed } = await inquirer.prompt([{
    type: 'confirm', name: 'confirmed',
    message: chalk.yellow(' Confirm swap?'), default: false,
  }]);
  if (!confirmed) { console.log(chalk.gray('\n  Cancelled.\n')); return; }

  // ── Approve if ERC-20 ─────────────────────────────────────────────────────
  if (fromToken.address !== NATIVE_TOKEN) {
    try {
      await ensureAllowance(
        walletClient, publicClient,
        fromToken.address as `0x${string}`,
        account.address,
        BigInt(amountWei),
        account,
      );
    } catch (e) {
      console.error(chalk.red(`\n  Approval failed: ${e instanceof Error ? e.message : String(e)}\n`));
      return;
    }
  }

  // ── Get swap calldata ─────────────────────────────────────────────────────
  const buildSpinner = ora(chalk.cyan(' Building swap transaction...')).start();
  let swapTx: SwapTx;
  try {
    swapTx = await getSwapTx(chain.id, fromToken.address, toToken.address, amountWei, account.address, slippage, apiKey);
    buildSpinner.stop();
  } catch (e) {
    buildSpinner.stop();
    console.error(chalk.red(`\n  Build failed: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}\n`));
    return;
  }

  // ── Execute ───────────────────────────────────────────────────────────────
  const execSpinner = ora(chalk.cyan(' Broadcasting swap...')).start();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hash = await (walletClient as any).sendTransaction({
      account,
      to:    swapTx.to,
      data:  swapTx.data,
      value: BigInt(swapTx.value),
      gas:   BigInt(Math.round(swapTx.gas * 1.2)), // 20% gas buffer
      chain: chain.chain,                    // required by viem v2 — must be Chain, not chain id
    });

    execSpinner.text = chalk.cyan(' Waiting for confirmation...');
    await publicClient.waitForTransactionReceipt({ hash });
    execSpinner.succeed(chalk.green(' ✓ Swap confirmed!'));

    console.log(`\n  ${chalk.gray('Tx:')}   ${chalk.cyan(hash)}`);
    const explorerUrl = chain.explorerUrl;
    if (explorerUrl) console.log(`  ${chalk.gray('View:')} ${chalk.gray(`${explorerUrl}/tx/${hash}`)}`);
    console.log('');

    await syncActivity('SWAP', { from: fromSymbol, to: toSymbol, amount },
      `Swapped ${amountRaw} ${fromSymbol.toUpperCase()} → ${toAmountFmt} ${toSymbol.toUpperCase()}`);

  } catch (e) {
    execSpinner.fail(chalk.red(' Swap failed'));
    console.error(chalk.red(`  ${e instanceof Error ? e.message.slice(0, 150) : String(e)}\n`));
  }
}