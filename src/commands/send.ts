import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { isAddress, parseEther, parseUnits, createWalletClient, http, formatEther, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getPublicClient, getCurrentChain } from '../core/blockchain/chains.js';
import { Vault } from '../core/security/vault.js';
import { syncActivity } from '../core/utils/supabase.js';

const ERC20_ABI = [
  { name: 'decimals',  type: 'function' as const, stateMutability: 'view' as const,       inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'symbol',    type: 'function' as const, stateMutability: 'view' as const,       inputs: [], outputs: [{ type: 'string' }] },
  { name: 'balanceOf', type: 'function' as const, stateMutability: 'view' as const,       inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'transfer',  type: 'function' as const, stateMutability: 'nonpayable' as const, inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;

const TOKEN_ADDRESSES: Record<string, `0x${string}`> = {
  usdc:  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  usdt:  '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  dai:   '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  weth:  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  wbtc:  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  link:  '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  uni:   '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
};

function resolveTokenAddress(token: string): `0x${string}` | null {
  if (isAddress(token)) return token as `0x${string}`;
  return TOKEN_ADDRESSES[token.toLowerCase()] ?? null;
}

async function resolveRecipient(input: string): Promise<`0x${string}` | null> {
  if (isAddress(input)) return input as `0x${string}`;
  if (input.endsWith('.eth')) {
    try {
      const addr = await getPublicClient().getEnsAddress({ name: input });
      return addr ?? null;
    } catch { return null; }
  }
  return null;
}

export async function sendCommand(args: string[]): Promise<void> {
  if (args.length < 3 || args[0] === '--help') {
    console.log(chalk.bold.cyan('\n  aura send <amount> <token> <address|ENS>\n'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura send 0.1 ETH 0xAbCd...'));
    console.log(chalk.gray('    aura send 100 USDC vitalik.eth\n'));
    return;
  }

  const [amountRaw, tokenSymbol, recipientRaw] = args;
  const amount = parseFloat(amountRaw);
  if (isNaN(amount) || amount <= 0) { console.error(chalk.red('\n  Invalid amount\n')); return; }
  if (!Vault.isSetup()) { console.log(chalk.yellow('\n  Run "aura setup" first.\n')); return; }

  const spinner = ora(chalk.cyan(' Resolving recipient...')).start();
  const toAddress = await resolveRecipient(recipientRaw);
  spinner.stop();

  if (!toAddress) { console.error(chalk.red(`\n  Cannot resolve: "${recipientRaw}"\n`)); return; }

  const isETH     = tokenSymbol.toUpperCase() === 'ETH';
  const tokenAddr = isETH ? null : resolveTokenAddress(tokenSymbol);
  if (!isETH && !tokenAddr) {
    console.error(chalk.red(`\n  Unknown token "${tokenSymbol}". Use contract address or known symbol (USDC, USDT, DAI, WETH...).\n`));
    return;
  }

  const { masterPassword } = await inquirer.prompt([{
    type: 'password', name: 'masterPassword', message: chalk.cyan(' Master password:'),
  }]);
  const privateKey = Vault.getKey(masterPassword);
  if (!privateKey) { console.log(chalk.red(' Invalid password.\n')); return; }

  const account      = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}` as `0x${string}`);
  const chain        = getCurrentChain();
  const publicClient = getPublicClient();
  const walletClient = createWalletClient({ account, chain: chain.chain, transport: http() });

  // Balance pre-check
  const checkSpinner = ora(chalk.cyan(' Checking balance...')).start();
  try {
    if (isETH) {
      const bal    = await publicClient.getBalance({ address: account.address });
      const needed = parseEther(amountRaw);
      if (bal < needed) {
        checkSpinner.stop();
        console.error(chalk.red(`\n  Insufficient ETH. Have: ${formatEther(bal)}, Need: ${amountRaw}\n`));
        return;
      }
    } else {
      const decimals = await publicClient.readContract({ address: tokenAddr!, abi: ERC20_ABI, functionName: 'decimals' }) as number;
      const bal      = await publicClient.readContract({ address: tokenAddr!, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }) as bigint;
      const needed   = parseUnits(amountRaw, decimals);
      if (bal < needed) {
        checkSpinner.stop();
        console.error(chalk.red(`\n  Insufficient ${tokenSymbol.toUpperCase()}. Have: ${formatUnits(bal, decimals)}, Need: ${amountRaw}\n`));
        return;
      }
    }
    checkSpinner.stop();
  } catch { checkSpinner.stop(); }

  const displayTo = recipientRaw.endsWith('.eth')
    ? `${recipientRaw} (${toAddress.slice(0, 10)}...)`
    : `${toAddress.slice(0, 10)}...${toAddress.slice(-6)}`;

  console.log(chalk.bold.cyan('\n  Transaction Preview:'));
  console.log(chalk.gray('  ' + '─'.repeat(40)));
  console.log(`  ${chalk.gray('From:  ')} ${chalk.white(`${account.address.slice(0, 10)}...${account.address.slice(-6)}`)}`);
  console.log(`  ${chalk.gray('To:    ')} ${chalk.white(displayTo)}`);
  console.log(`  ${chalk.gray('Amount:')} ${chalk.yellow(amountRaw)} ${chalk.white(tokenSymbol.toUpperCase())}`);
  console.log(`  ${chalk.gray('Chain: ')} ${chalk.cyan(chain.name)}\n`);

  const { confirmed } = await inquirer.prompt([{
    type: 'confirm', name: 'confirmed',
    message: chalk.yellow(' Confirm transaction?'), default: false,
  }]);
  if (!confirmed) { console.log(chalk.gray('\n  Cancelled.\n')); return; }

  const sendSpinner = ora(chalk.cyan(' Broadcasting...')).start();
  try {
    let hash: `0x${string}`;

    if (isETH) {
      hash = await walletClient.sendTransaction({ account, chain: chain.chain, to: toAddress, value: parseEther(amountRaw), kzg: undefined });
    } else {
      const decimals = await publicClient.readContract({ address: tokenAddr!, abi: ERC20_ABI, functionName: 'decimals' }) as number;
      hash = await walletClient.writeContract({
        account,
        chain: chain.chain,
        address: tokenAddr!, abi: ERC20_ABI, functionName: 'transfer',
        args: [toAddress, parseUnits(amountRaw, decimals)],
      });
    }

    sendSpinner.text = chalk.cyan(' Waiting for confirmation...');
    await publicClient.waitForTransactionReceipt({ hash });
    sendSpinner.succeed(chalk.green(' ✓ Confirmed!'));

    console.log(`\n  ${chalk.gray('Tx:')}   ${chalk.cyan(hash)}`);
    const explorerUrl = chain.explorerUrl;
    if (explorerUrl) console.log(`  ${chalk.gray('View:')} ${chalk.gray(`${explorerUrl}/tx/${hash}`)}`);
    console.log('');

    await syncActivity('SEND', { to: toAddress, amount, token: tokenSymbol }, `Sent ${amount} ${tokenSymbol.toUpperCase()} → ${displayTo}`);
  } catch (e) {
    sendSpinner.fail(chalk.red(' Transaction failed'));
    console.error(chalk.red(`  ${e instanceof Error ? e.message.slice(0, 150) : String(e)}\n`));
  }
}