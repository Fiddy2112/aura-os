import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { parseEther, formatEther, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getPublicClient, getCurrentChain } from '../core/blockchain/chains.js';
import { Vault } from '../core/security/vault.js';
import { syncActivity } from '../core/utils/supabase.js';

// ── Protocol definitions ──────────────────────────────────────────────────────

const PROTOCOLS = {
  lido: {
    name:        'Lido',
    token:       'stETH',
    description: 'Liquid staking — receive stETH, earns staking rewards daily',
    contract:    '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84' as `0x${string}`,
    abi: [
      { name: 'submit',       type: 'function' as const, stateMutability: 'payable' as const,  inputs: [{ name: '_referral', type: 'address' }], outputs: [{ type: 'uint256' }] },
      { name: 'balanceOf',    type: 'function' as const, stateMutability: 'view' as const,     inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
      { name: 'getTotalPooledEther', type: 'function' as const, stateMutability: 'view' as const, inputs: [], outputs: [{ type: 'uint256' }] },
      { name: 'getTotalShares',      type: 'function' as const, stateMutability: 'view' as const, inputs: [], outputs: [{ type: 'uint256' }] },
    ] as const,
    minStake:    0.01,
    aprEstimate: 3.8, // approximate
    network:     1, // mainnet only
  },
  rocketpool: {
    name:        'Rocket Pool',
    token:       'rETH',
    description: 'Decentralized staking — receive rETH, value appreciates over time',
    contract:    '0xDD3f50F8A6CafbE9b31a427582963f465E745AF8' as `0x${string}`,
    abi: [
      { name: 'deposit',          type: 'function' as const, stateMutability: 'payable' as const, inputs: [], outputs: [] },
      { name: 'balanceOf',        type: 'function' as const, stateMutability: 'view' as const,    inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
      { name: 'getExchangeRate',  type: 'function' as const, stateMutability: 'view' as const,    inputs: [], outputs: [{ type: 'uint256' }] },
      { name: 'getDepositEnabled', type: 'function' as const, stateMutability: 'view' as const,   inputs: [], outputs: [{ type: 'bool' }] },
    ] as const,
    minStake:    0.01,
    aprEstimate: 3.6,
    network:     1,
  },
} as const;

type ProtocolKey = keyof typeof PROTOCOLS;
const ZERO_ADDR  = '0x0000000000000000000000000000000000000000' as const;

// ── Protocol info fetch ───────────────────────────────────────────────────────

async function getLidoInfo(address: `0x${string}`) {
  const client   = getPublicClient();
  const protocol = PROTOCOLS.lido;
  try {
    const [balance, pooled, shares] = await Promise.all([
      client.readContract({ address: protocol.contract, abi: protocol.abi, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
      client.readContract({ address: protocol.contract, abi: protocol.abi, functionName: 'getTotalPooledEther' }) as Promise<bigint>,
      client.readContract({ address: protocol.contract, abi: protocol.abi, functionName: 'getTotalShares' }) as Promise<bigint>,
    ]);
    return { balance, tvl: pooled, shares };
  } catch { return null; }
}

async function getRocketPoolInfo(address: `0x${string}`) {
  const client   = getPublicClient();
  const protocol = PROTOCOLS.rocketpool;
  try {
    const [balance, rate, enabled] = await Promise.all([
      client.readContract({ address: protocol.contract, abi: protocol.abi, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
      client.readContract({ address: protocol.contract, abi: protocol.abi, functionName: 'getExchangeRate' }) as Promise<bigint>,
      client.readContract({ address: protocol.contract, abi: protocol.abi, functionName: 'getDepositEnabled' }) as Promise<boolean>,
    ]);
    return { balance, exchangeRate: rate, depositEnabled: enabled };
  } catch { return null; }
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function stakeCommand(args: string[]): Promise<void> {
  const amountRaw     = args[0];
  const protocolArg   = args[1]?.toLowerCase() as ProtocolKey | undefined;
  const isInfo        = args.includes('--info') || !amountRaw || amountRaw === '--info';

  if (!amountRaw || amountRaw === '--help') {
    console.log(chalk.bold.cyan('\n  aura stake <amount> <protocol> [--info]\n'));
    console.log(chalk.gray('  Stake ETH via liquid staking protocols.\n'));
    console.log(chalk.gray('  Protocols:'));
    console.log(chalk.gray('    lido       — stETH (~3.8% APR), liquid, mainnet only'));
    console.log(chalk.gray('    rocketpool — rETH (~3.6% APR), decentralized, mainnet only\n'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura stake 0.5 lido'));
    console.log(chalk.gray('    aura stake 1 rocketpool'));
    console.log(chalk.gray('    aura stake --info           (show balances)\n'));
    return;
  }

  const chain = getCurrentChain();
  if (chain.id !== 1) {
    console.error(chalk.red('\n  Staking requires Ethereum mainnet. Switch with: aura chain set mainnet\n'));
    return;
  }

  // ── Info mode ─────────────────────────────────────────────────────────────
  if (isInfo) {
    if (!Vault.isSetup()) { console.log(chalk.yellow('\n  Run "aura setup" first.\n')); return; }

    const { masterPassword } = await inquirer.prompt([{
      type: 'password', name: 'masterPassword', message: chalk.cyan(' Master password:'),
    }]);
    const privateKey = Vault.getKey(masterPassword);
    if (!privateKey) { console.log(chalk.red(' Invalid password.\n')); return; }

    const account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}` as `0x${string}`);
    const spinner = ora(chalk.cyan(' Fetching staking positions...')).start();

    const [lido, rp] = await Promise.all([getLidoInfo(account.address), getRocketPoolInfo(account.address)]);
    spinner.stop();

    const divider = chalk.gray('─'.repeat(52));
    console.log(chalk.bold.cyan('\n  Staking Positions'));
    console.log(divider);

    if (lido) {
      console.log(`  ${chalk.yellow('Lido (stETH)')}`);
      console.log(`  ${chalk.gray('Balance:')} ${chalk.white(parseFloat(formatEther(lido.balance)).toFixed(6))} stETH`);
      console.log(`  ${chalk.gray('TVL:    ')} ${chalk.gray(parseFloat(formatEther(lido.tvl)).toFixed(0))} ETH`);
      console.log(`  ${chalk.gray('APR:    ')} ${chalk.green('~3.8%')}\n`);
    }

    if (rp) {
      const rate = parseFloat(formatEther(rp.exchangeRate));
      console.log(`  ${chalk.yellow('Rocket Pool (rETH)')}`);
      console.log(`  ${chalk.gray('Balance:')} ${chalk.white(parseFloat(formatEther(rp.balance)).toFixed(6))} rETH`);
      console.log(`  ${chalk.gray('Rate:   ')} ${chalk.gray(`1 rETH = ${rate.toFixed(4)} ETH`)}`);
      console.log(`  ${chalk.gray('APR:    ')} ${chalk.green('~3.6%')}`);
      console.log(`  ${chalk.gray('Deposits:')} ${rp.depositEnabled ? chalk.green('open') : chalk.red('paused')}\n`);
    }

    console.log(divider + '\n');
    return;
  }

  // ── Stake ─────────────────────────────────────────────────────────────────
  const amount = parseFloat(amountRaw);
  if (isNaN(amount) || amount <= 0) { console.error(chalk.red('\n  Invalid amount\n')); return; }

  if (!protocolArg || !PROTOCOLS[protocolArg]) {
    console.error(chalk.red(`\n  Unknown protocol: "${protocolArg ?? ''}". Use "lido" or "rocketpool".\n`));
    return;
  }

  const protocol = PROTOCOLS[protocolArg];
  if (amount < protocol.minStake) {
    console.error(chalk.red(`\n  Minimum stake: ${protocol.minStake} ETH\n`));
    return;
  }

  if (!Vault.isSetup()) { console.log(chalk.yellow('\n  Run "aura setup" first.\n')); return; }

  const { masterPassword } = await inquirer.prompt([{
    type: 'password', name: 'masterPassword', message: chalk.cyan(' Master password:'),
  }]);
  const privateKey = Vault.getKey(masterPassword);
  if (!privateKey) { console.log(chalk.red(' Invalid password.\n')); return; }

  const account      = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}` as `0x${string}`);
  const publicClient = getPublicClient();
  const walletClient = createWalletClient({ account, chain: chain.chain, transport: http() });
  const amountWei    = parseEther(amountRaw);

  // Balance check
  const balance = await publicClient.getBalance({ address: account.address });
  if (balance < amountWei) {
    console.error(chalk.red(`\n  Insufficient ETH. Have: ${formatEther(balance)}, Need: ${amountRaw}\n`));
    return;
  }

  const estReward = (amount * protocol.aprEstimate / 100).toFixed(4);

  console.log(chalk.bold.cyan('\n  Stake Preview:'));
  console.log(chalk.gray('  ' + '─'.repeat(44)));
  console.log(`  ${chalk.gray('Protocol:')} ${chalk.white(protocol.name)}`);
  console.log(`  ${chalk.gray('Stake:   ')} ${chalk.yellow(amountRaw)} ETH`);
  console.log(`  ${chalk.gray('Receive: ')} ${chalk.green(`~${amountRaw} ${protocol.token}`)}`);
  console.log(`  ${chalk.gray('Est APR: ')} ${chalk.green(`${protocol.aprEstimate}%`)} (~${estReward} ETH/year)`);
  console.log(`  ${chalk.gray('Note:    ')} ${chalk.gray(protocol.description)}\n`);

  const { confirmed } = await inquirer.prompt([{
    type: 'confirm', name: 'confirmed',
    message: chalk.yellow(` Confirm stake ${amountRaw} ETH on ${protocol.name}?`), default: false,
  }]);
  if (!confirmed) { console.log(chalk.gray('\n  Cancelled.\n')); return; }

  const spinner = ora(chalk.cyan(' Staking...')).start();
  try {
    let hash: `0x${string}`;

    if (protocolArg === 'lido') {
      hash = await walletClient.writeContract({
        chain:        chain.chain,
        account,
        address:      protocol.contract,
        abi:          protocol.abi,
        functionName: 'submit',
        args:         [ZERO_ADDR], // no referral
        value:        amountWei,
      });
    } else {
      // Rocket Pool — plain payable deposit()
      hash = await walletClient.writeContract({
        chain:        chain.chain,
        account,
        address:      protocol.contract,
        abi:          protocol.abi,
        functionName: 'deposit',
        value:        amountWei,
      });
    }

    spinner.text = chalk.cyan(' Waiting for confirmation...');
    await publicClient.waitForTransactionReceipt({ hash });
    spinner.succeed(chalk.green(` ✓ Staked ${amountRaw} ETH on ${protocol.name}!`));

    console.log(`\n  ${chalk.gray('Tx:')}     ${chalk.cyan(hash)}`);
    console.log(`  ${chalk.gray('View:')}   ${chalk.gray(`https://etherscan.io/tx/${hash}`)}`);
    console.log(chalk.green(`\n  You now hold ~${amountRaw} ${protocol.token} earning ~${protocol.aprEstimate}% APR.\n`));

    await syncActivity('STAKE', { protocol: protocol.name, amount }, `Staked ${amountRaw} ETH on ${protocol.name}`);

  } catch (e) {
    spinner.fail(chalk.red(' Staking failed'));
    console.error(chalk.red(`  ${e instanceof Error ? e.message.slice(0, 150) : String(e)}\n`));
  }
}