import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import axios from 'axios';
import { isAddress, parseEther, parseUnits, createWalletClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getPublicClient, getCurrentChain } from '../core/blockchain/chains.js';
import { Vault } from '../core/security/vault.js';
import { syncActivity } from '../core/utils/supabase.js';

// ── Supported chains ──────────────────────────────────────────────────────────

const SUPPORTED_CHAINS: Record<string, { id: number; label: string }> = {
  ethereum: { id: 1,     label: 'Ethereum' },
  base:     { id: 8453,  label: 'Base' },
  optimism: { id: 10,    label: 'Optimism' },
  arbitrum: { id: 42161, label: 'Arbitrum' },
  polygon:  { id: 137,   label: 'Polygon' },
  avalanche:{ id: 43114, label: 'Avalanche' },
};

// Across Protocol supported tokens per chain (common routes)
const ACROSS_SUPPORTED: Record<string, string[]> = {
  usdc:  ['ethereum', 'base', 'optimism', 'arbitrum', 'polygon'],
  usdt:  ['ethereum', 'optimism', 'arbitrum', 'polygon'],
  eth:   ['ethereum', 'base', 'optimism', 'arbitrum'],
  weth:  ['ethereum', 'base', 'optimism', 'arbitrum'],
  dai:   ['ethereum', 'base', 'optimism', 'arbitrum', 'polygon'],
};

// Across Protocol V3 Spoke Pool addresses
const ACROSS_SPOKE_POOLS: Record<number, `0x${string}`> = {
  1:     '0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5',
  8453:  '0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64',
  10:    '0x6f26Bf09B1C792e3228e5467807a900A503c0281',
  42161: '0xe35e9842fceaCA96570B734083f4a58e8F7C5f2A',
  137:   '0x9295ee1d8C5b022Be115A2AD3c30C72E34e7F096',
};

const SPOKE_POOL_ABI = [
  {
    name: 'depositV3',
    type: 'function' as const,
    stateMutability: 'payable' as const,
    inputs: [
      { name: 'depositor',         type: 'address' },
      { name: 'recipient',         type: 'address' },
      { name: 'inputToken',        type: 'address' },
      { name: 'outputToken',       type: 'address' },
      { name: 'inputAmount',       type: 'uint256' },
      { name: 'outputAmount',      type: 'uint256' },
      { name: 'destinationChainId', type: 'uint256' },
      { name: 'exclusiveRelayer',  type: 'address' },
      { name: 'quoteTimestamp',    type: 'uint32' },
      { name: 'fillDeadline',      type: 'uint32' },
      { name: 'exclusivityDeadline', type: 'uint32' },
      { name: 'message',           type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

// ── Across quote ──────────────────────────────────────────────────────────────

interface AcrossQuote {
  outputAmount:    bigint;
  fee:             bigint;
  estimatedTime:   number; // seconds
  relayerFeeUSD:   number;
  inputToken:      `0x${string}`;
  outputToken:     `0x${string}`;
  quoteTimestamp:  number;
}

async function getAcrossQuote(
  fromChainId: number,
  toChainId:   number,
  token:       string,
  amount:      bigint,
): Promise<AcrossQuote | null> {
  try {
    const res = await axios.get('https://across.to/api/suggested-fees', {
      params: {
        originChainId:      fromChainId,
        destinationChainId: toChainId,
        token:              token.toUpperCase(),
        amount:             amount.toString(),
      },
      timeout: 10000,
    });

    const data = res.data;
    const totalFee    = BigInt(data.totalRelayFee?.total ?? '0');
    const outputAmt   = amount - totalFee;

    return {
      outputAmount:   outputAmt > 0n ? outputAmt : 0n,
      fee:            totalFee,
      estimatedTime:  data.estimatedFillTimeSec ?? 60,
      relayerFeeUSD:  parseFloat(data.totalRelayFee?.usd ?? '0'),
      inputToken:     data.inputToken  as `0x${string}`,
      outputToken:    data.outputToken as `0x${string}`,
      quoteTimestamp: Math.floor(Date.now() / 1000),
    };
  } catch { return null; }
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function bridgeCommand(args: string[]): Promise<void> {
  // Usage: aura bridge <amount> <token> <from-chain> <to-chain> [--to <address>]
  if (args.length < 4 || args[0] === '--help') {
    console.log(chalk.bold.cyan('\n  aura bridge <amount> <token> <from> <to> [--to <address>]\n'));
    console.log(chalk.gray('  Bridge assets cross-chain via Across Protocol.\n'));
    console.log(chalk.gray('  Supported chains: ethereum, base, optimism, arbitrum, polygon, avalanche'));
    console.log(chalk.gray('  Supported tokens: ETH, USDC, USDT, DAI, WETH\n'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura bridge 100 USDC ethereum arbitrum'));
    console.log(chalk.gray('    aura bridge 0.5 ETH base optimism'));
    console.log(chalk.gray('    aura bridge 50 DAI ethereum base --to 0xAbCd...\n'));
    return;
  }

  const [amountRaw, tokenSymbol, fromChainName, toChainName] = args;
  const toIdx     = args.indexOf('--to');
  const overrideTo = toIdx !== -1 ? args[toIdx + 1] : undefined;

  const amount = parseFloat(amountRaw);
  if (isNaN(amount) || amount <= 0) { console.error(chalk.red('\n  Invalid amount\n')); return; }

  const fromChain = SUPPORTED_CHAINS[fromChainName.toLowerCase()];
  const toChain   = SUPPORTED_CHAINS[toChainName.toLowerCase()];

  if (!fromChain) {
    console.error(chalk.red(`\n  Unknown source chain: "${fromChainName}"`));
    console.log(chalk.gray(`  Supported: ${Object.keys(SUPPORTED_CHAINS).join(', ')}\n`));
    return;
  }
  if (!toChain) {
    console.error(chalk.red(`\n  Unknown destination chain: "${toChainName}"`));
    console.log(chalk.gray(`  Supported: ${Object.keys(SUPPORTED_CHAINS).join(', ')}\n`));
    return;
  }
  if (fromChain.id === toChain.id) {
    console.error(chalk.red('\n  Source and destination chains must be different\n'));
    return;
  }

  const token    = tokenSymbol.toLowerCase();
  const isETH    = token === 'eth';
  const amountWei = parseEther(amountRaw);

  // Check token support
  const supportedChains = ACROSS_SUPPORTED[token];
  if (!supportedChains) {
    console.error(chalk.red(`\n  Token "${tokenSymbol}" not supported. Supported: ${Object.keys(ACROSS_SUPPORTED).join(', ')}\n`));
    return;
  }
  if (!supportedChains.includes(fromChainName.toLowerCase()) || !supportedChains.includes(toChainName.toLowerCase())) {
    console.error(chalk.red(`\n  ${tokenSymbol} not supported on this route.\n`));
    console.log(chalk.gray(`  Supported chains for ${tokenSymbol}: ${supportedChains.join(', ')}\n`));
    return;
  }

  const spokePool = ACROSS_SPOKE_POOLS[fromChain.id];
  if (!spokePool) {
    console.error(chalk.red(`\n  Across spoke pool not configured for ${fromChainName}\n`));
    return;
  }

  if (!Vault.isSetup()) { console.log(chalk.yellow('\n  Run "aura setup" first.\n')); return; }

  // Get quote
  const quoteSpinner = ora(chalk.cyan(' Fetching bridge quote...')).start();
  const quote = await getAcrossQuote(fromChain.id, toChain.id, tokenSymbol, amountWei);
  quoteSpinner.stop();

  if (!quote || quote.outputAmount === 0n) {
    console.error(chalk.red('\n  Could not get bridge quote from Across. Try a different amount or route.\n'));
    return;
  }

  // Unlock wallet
  const { masterPassword } = await inquirer.prompt([{
    type: 'password', name: 'masterPassword', message: chalk.cyan(' Master password:'),
  }]);
  const privateKey = Vault.getKey(masterPassword);
  if (!privateKey) { console.log(chalk.red(' Invalid password.\n')); return; }

  const account  = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}` as `0x${string}`);
  const chain    = getCurrentChain();
  const recipient = overrideTo ? overrideTo as `0x${string}` : account.address;

  const estimateMins = Math.ceil(quote.estimatedTime / 60);

  console.log(chalk.bold.cyan('\n  Bridge Quote (Across Protocol):'));
  console.log(chalk.gray('  ' + '─'.repeat(44)));
  console.log(`  ${chalk.gray('From:')}      ${chalk.white(fromChain.label)}`);
  console.log(`  ${chalk.gray('To:')}        ${chalk.white(toChain.label)}`);
  console.log(`  ${chalk.gray('Send:')}      ${chalk.yellow(amountRaw)} ${tokenSymbol.toUpperCase()}`);
  console.log(`  ${chalk.gray('Receive:')}   ${chalk.green(formatEther(quote.outputAmount))} ${tokenSymbol.toUpperCase()}`);
  console.log(`  ${chalk.gray('Fee:')}       ${chalk.red(formatEther(quote.fee))} ${tokenSymbol.toUpperCase()} ($${quote.relayerFeeUSD.toFixed(2)})`);
  console.log(`  ${chalk.gray('Est. time:')} ${chalk.cyan(`~${estimateMins} min`)}`);
  console.log(`  ${chalk.gray('Recipient:')} ${chalk.white(`${recipient.slice(0, 10)}...${recipient.slice(-6)}`)}\n`);

  const { confirmed } = await inquirer.prompt([{
    type: 'confirm', name: 'confirmed',
    message: chalk.yellow(' Confirm bridge transaction?'), default: false,
  }]);
  if (!confirmed) { console.log(chalk.gray('\n  Cancelled.\n')); return; }

  // Execute — must be on fromChain
  if (chain.id !== fromChain.id) {
    console.error(chalk.red(`\n  You must be on ${fromChain.label} to bridge from it.`));
    console.log(chalk.gray(`  Switch with: aura chain set ${fromChainName}\n`));
    return;
  }

  const publicClient = getPublicClient();
  const walletClient = createWalletClient({ account, chain: chain.chain, transport: http() });
  const deadline     = Math.floor(Date.now() / 1000) + 3600; // 1h fill deadline

  const txSpinner = ora(chalk.cyan(' Sending bridge transaction...')).start();
  try {
    const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as const;

    const hash = await walletClient.writeContract({
      account,
      chain: chain.chain,
      address:      spokePool,
      abi:          SPOKE_POOL_ABI,
      functionName: 'depositV3',
      args: [
        account.address,
        recipient,
        isETH ? ZERO_ADDR : quote.inputToken,
        isETH ? ZERO_ADDR : quote.outputToken,
        amountWei,
        quote.outputAmount,
        BigInt(toChain.id),
        ZERO_ADDR,
        quote.quoteTimestamp,
        deadline,
        0,
        '0x',
      ],
      value: isETH ? amountWei : 0n,
    });

    txSpinner.text = chalk.cyan(' Waiting for source chain confirmation...');
    await publicClient.waitForTransactionReceipt({ hash });
    txSpinner.succeed(chalk.green(' ✓ Bridge initiated!'));

    console.log(`\n  ${chalk.gray('Tx:')}      ${chalk.cyan(hash)}`);
    const explorerUrl = chain.explorerUrl;
    if (explorerUrl) console.log(`  ${chalk.gray('View:')}    ${chalk.gray(`${explorerUrl}/tx/${hash}`)}`);
    console.log(chalk.gray(`  Track:    https://across.to`));
    console.log(chalk.cyan(`\n  Funds should arrive on ${toChain.label} in ~${estimateMins} minute(s).\n`));

    await syncActivity('BRIDGE', { from: fromChainName, to: toChainName, amount, token: tokenSymbol },
      `${amountRaw} ${tokenSymbol.toUpperCase()} ${fromChain.label} → ${toChain.label}`);

  } catch (e) {
    txSpinner.fail(chalk.red(' Bridge transaction failed'));
    console.error(chalk.red(`  ${e instanceof Error ? e.message.slice(0, 150) : String(e)}\n`));
  }
}