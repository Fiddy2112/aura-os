import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { parseEther, formatEther, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getPublicClient, getCurrentChain } from '../core/blockchain/chains.js';
import { Vault } from '../core/security/vault.js';
import { syncActivity } from '../core/utils/supabase.js';

// ── WETH addresses per chain ──────────────────────────────────────────────────

const WETH_BY_CHAIN: Record<number, `0x${string}`> = {
  1:        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Ethereum
  8453:     '0x4200000000000000000000000000000000000006', // Base
  10:       '0x4200000000000000000000000000000000000006', // Optimism
  42161:    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // Arbitrum
  137:      '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // Polygon (WETH)
  43114:    '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', // Avalanche (WETH.e)
  56:       '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // BSC (WBNB)
  11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // Sepolia
};

const WETH_ABI = [
  { name: 'deposit',   type: 'function' as const, stateMutability: 'payable' as const,    inputs: [], outputs: [] },
  { name: 'withdraw',  type: 'function' as const, stateMutability: 'nonpayable' as const, inputs: [{ name: 'wad', type: 'uint256' }], outputs: [] },
  { name: 'balanceOf', type: 'function' as const, stateMutability: 'view' as const,       inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

// ── Command ───────────────────────────────────────────────────────────────────

export async function wrapCommand(args: string[], mode: 'wrap' | 'unwrap'): Promise<void> {
  const amountRaw = args[0];
  const isWrap    = mode === 'wrap';

  if (!amountRaw || amountRaw === '--help') {
    const cmd = isWrap ? 'wrap' : 'unwrap';
    const from = isWrap ? 'ETH' : 'WETH';
    const to   = isWrap ? 'WETH' : 'ETH';
    console.log(chalk.bold.cyan(`\n  aura ${cmd} <amount>\n`));
    console.log(chalk.gray(`  Convert ${from} → ${to}.\n`));
    console.log(chalk.gray(`  Example: aura ${cmd} 0.5\n`));
    return;
  }

  const amount = parseFloat(amountRaw);
  if (isNaN(amount) || amount <= 0) { console.error(chalk.red('\n  Invalid amount\n')); return; }
  if (!Vault.isSetup()) { console.log(chalk.yellow('\n  Run "aura setup" first.\n')); return; }

  const chain     = getCurrentChain();
  const wethAddr  = WETH_BY_CHAIN[chain.id];

  if (!wethAddr) {
    console.error(chalk.red(`\n  WETH not configured for chain: ${chain.name}. Switch to mainnet or a supported L2.\n`));
    return;
  }

  const { masterPassword } = await inquirer.prompt([{
    type: 'password', name: 'masterPassword', message: chalk.cyan(' Master password:'),
  }]);
  const privateKey = Vault.getKey(masterPassword);
  if (!privateKey) { console.log(chalk.red(' Invalid password.\n')); return; }

  const account      = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}` as `0x${string}`);
  const publicClient = getPublicClient();
  const walletClient = createWalletClient({ account, chain:chain.chain, transport: http() });
  const amountWei    = parseEther(amountRaw);

  // Show balances
  const balSpinner = ora(chalk.cyan(' Fetching balances...')).start();
  let ethBal  = 0n;
  let wethBal = 0n;
  try {
    [ethBal, wethBal] = await Promise.all([
      publicClient.getBalance({ address: account.address }),
      publicClient.readContract({ address: wethAddr, abi: WETH_ABI, functionName: 'balanceOf', args: [account.address] }) as Promise<bigint>,
    ]);
    balSpinner.stop();
  } catch { balSpinner.stop(); }

  // Balance check
  if (isWrap && ethBal < amountWei) {
    console.error(chalk.red(`\n  Insufficient ETH. Have: ${formatEther(ethBal)}, Need: ${amountRaw}\n`));
    return;
  }
  if (!isWrap && wethBal < amountWei) {
    console.error(chalk.red(`\n  Insufficient WETH. Have: ${formatEther(wethBal)}, Need: ${amountRaw}\n`));
    return;
  }

  const from = isWrap ? 'ETH'  : 'WETH';
  const to   = isWrap ? 'WETH' : 'ETH';

  console.log(chalk.bold.cyan('\n  Wrap Preview:'));
  console.log(chalk.gray('  ' + '─'.repeat(36)));
  console.log(`  ${chalk.gray('Action:')} ${isWrap ? chalk.yellow('ETH → WETH') : chalk.yellow('WETH → ETH')}`);
  console.log(`  ${chalk.gray('Amount:')} ${chalk.yellow(amountRaw)} ${chalk.white(from)}`);
  console.log(`  ${chalk.gray('Chain: ')} ${chalk.cyan(chain.name)}`);
  console.log(`  ${chalk.gray('ETH:   ')} ${chalk.white(formatEther(ethBal))}`);
  console.log(`  ${chalk.gray('WETH:  ')} ${chalk.white(formatEther(wethBal))}\n`);

  const { confirmed } = await inquirer.prompt([{
    type: 'confirm', name: 'confirmed',
    message: chalk.yellow(` Confirm ${from} → ${to}?`), default: false,
  }]);
  if (!confirmed) { console.log(chalk.gray('\n  Cancelled.\n')); return; }

  const txSpinner = ora(chalk.cyan(' Broadcasting...')).start();
  try {
    let hash: `0x${string}`;

    if (isWrap) {
      // deposit() — payable, send ETH with call
      hash = await walletClient.writeContract({
        account,
        chain:chain.chain,
        address: wethAddr, abi: WETH_ABI, functionName: 'deposit',
        value: amountWei,
      });
    } else {
      // withdraw(wad)
      hash = await walletClient.writeContract({
        account,
        chain:chain.chain,
        address: wethAddr, abi: WETH_ABI, functionName: 'withdraw',
        args: [amountWei],
      });
    }

    txSpinner.text = chalk.cyan(' Waiting for confirmation...');
    await publicClient.waitForTransactionReceipt({ hash });
    txSpinner.succeed(chalk.green(` ✓ ${amountRaw} ${from} → ${to} complete!`));

    console.log(`\n  ${chalk.gray('Tx:')}   ${chalk.cyan(hash)}`);
    const explorerUrl = chain.explorerUrl;
    if (explorerUrl) console.log(`  ${chalk.gray('View:')} ${chalk.gray(`${explorerUrl}/tx/${hash}`)}`);
    console.log('');

    await syncActivity(isWrap ? 'WRAP' : 'UNWRAP', { amount, chain: chain.name }, `${amountRaw} ${from} → ${to}`);
  } catch (e) {
    txSpinner.fail(chalk.red(' Transaction failed'));
    console.error(chalk.red(`  ${e instanceof Error ? e.message.slice(0, 150) : String(e)}\n`));
  }
}