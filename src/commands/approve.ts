import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { isAddress, formatUnits, maxUint256, getAddress, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getPublicClient, getCurrentChain } from '../core/blockchain/chains.js';
import { Vault } from '../core/security/vault.js';
import { syncActivity } from '../core/utils/supabase.js';

// ── ABIs ──────────────────────────────────────────────────────────────────────

const ERC20_ABI = [
  { name: 'Approval',  type: 'event' as const,    inputs: [{ name: 'owner', type: 'address', indexed: true }, { name: 'spender', type: 'address', indexed: true }, { name: 'value', type: 'uint256', indexed: false }] },
  { name: 'symbol',    type: 'function' as const, stateMutability: 'view' as const,       inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals',  type: 'function' as const, stateMutability: 'view' as const,       inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'allowance', type: 'function' as const, stateMutability: 'view' as const,       inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve',   type: 'function' as const, stateMutability: 'nonpayable' as const, inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],  outputs: [{ type: 'bool' }] },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApprovalEntry {
  token:       `0x${string}`;
  symbol:      string;
  decimals:    number;
  spender:     `0x${string}`;
  amount:      bigint;
  isUnlimited: boolean;
  blockNumber: bigint;
}

// ── Scan approvals via typed event logs ───────────────────────────────────────

async function scanApprovals(owner: `0x${string}`): Promise<ApprovalEntry[]> {
  const client    = getPublicClient();
  const latest    = await client.getBlockNumber();
  const fromBlock = latest > 500_000n ? latest - 500_000n : 0n;

  const logs = await client.getLogs({
    fromBlock,
    toBlock: latest,
    event:   ERC20_ABI[0],
    args:    { owner },
    strict:  true,
  });

  // Keep only the latest log per token+spender pair
  const latestMap = new Map<string, typeof logs[0]>();
  for (const log of logs) {
    if (!log.args.spender || log.blockNumber === null) continue;
    const key      = `${log.address.toLowerCase()}-${log.args.spender.toLowerCase()}`;
    const existing = latestMap.get(key);
    if (!existing || existing.blockNumber === null || log.blockNumber > existing.blockNumber) {
      latestMap.set(key, log);
    }
  }

  const entries: ApprovalEntry[] = [];

  for (const [, log] of latestMap) {
    if (!log.args.spender || log.blockNumber === null) continue;

    const token   = getAddress(log.address) as `0x${string}`;
    const spender = getAddress(log.args.spender) as `0x${string}`;

    // Re-fetch current allowance — log value can be stale after partial use
    let currentAllowance = 0n;
    try {
      currentAllowance = await client.readContract({
        address: token, abi: ERC20_ABI, functionName: 'allowance', args: [owner, spender],
      }) as bigint;
    } catch { continue; }

    if (currentAllowance === 0n) continue; // already revoked

    let symbol   = '???';
    let decimals = 18;
    try { symbol   = await client.readContract({ address: token, abi: ERC20_ABI, functionName: 'symbol'   }) as string; } catch {}
    try { decimals = await client.readContract({ address: token, abi: ERC20_ABI, functionName: 'decimals' }) as number; } catch {}

    entries.push({
      token, symbol, decimals, spender,
      amount:      currentAllowance,
      isUnlimited: currentAllowance >= maxUint256 / 2n,
      blockNumber: log.blockNumber,
    });
  }

  return entries.sort((a, b) => {
    if (a.isUnlimited !== b.isUnlimited) return a.isUnlimited ? -1 : 1;
    return b.amount > a.amount ? 1 : -1;
  });
}

// ── Revoke: direct walletClient.writeContract (not executor.execute) ──────────
// executor.execute() handles high-level intents like SEND_TOKEN, not low-level
// contract calls like approve(spender, 0). Using writeContract directly is correct.

async function revokeApproval(
  privateKey: string,
  token:      `0x${string}`,
  spender:    `0x${string}`,
  symbol:     string,
): Promise<void> {
  const spinner = ora(chalk.cyan(` Revoking ${symbol} → ${spender.slice(0, 10)}...`)).start();

  try {
    const chainConfig = getCurrentChain();
    const account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}` as `0x${string}`);

    const walletClient = createWalletClient({ account, chain: chainConfig.chain, transport: http() });

    const hash = await walletClient.writeContract({
      address:      token,
      abi:          ERC20_ABI,
      functionName: 'approve',
      args:         [spender, 0n],
      chain:        chainConfig.chain,
      account,
    });

    // Wait for confirmation
    const publicClient = getPublicClient();
    await publicClient.waitForTransactionReceipt({ hash });

    spinner.succeed(chalk.green(` ✓ Revoked ${symbol}  (tx: ${hash.slice(0, 18)}...)`));
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 120) : String(e);
    spinner.fail(chalk.red(` Failed to revoke ${symbol}: ${msg}`));
  }
}

// ── Display helpers ───────────────────────────────────────────────────────────

function formatAmount(amount: bigint, decimals: number, isUnlimited: boolean): string {
  if (isUnlimited) return chalk.red('UNLIMITED');
  const n = parseFloat(formatUnits(amount, decimals));
  return chalk.yellow(
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
    : n >= 1000    ? `${(n / 1000).toFixed(2)}K`
    : n.toFixed(4)
  );
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function approveCommand(args: string[]): Promise<void> {
  const address  = args[0] as `0x${string}`;
  const jsonMode = args.includes('--json');
  const doRevoke = args.includes('--revoke');

  if (!args[0] || args[0] === '--help') {
    console.log(chalk.bold.cyan('\n  aura approve <wallet-address> [--revoke] [--json]\n'));
    console.log(chalk.gray('  Scan all active ERC-20 token approvals for a wallet.'));
    console.log(chalk.gray('  Use --revoke to select and revoke approvals interactively.\n'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura approve 0x1234...abcd'));
    console.log(chalk.gray('    aura approve 0x1234...abcd --revoke\n'));
    return;
  }

  if (!isAddress(address)) {
    console.error(chalk.red('\n  Invalid address format\n'));
    return;
  }

  const spinner = ora(chalk.cyan(' Scanning approval history...')).start();

  try {
    const approvals = await scanApprovals(address);
    spinner.stop();

    if (jsonMode) {
      console.log(JSON.stringify(approvals, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
      return;
    }

    if (approvals.length === 0) {
      console.log(chalk.green('\n  ✓ No active approvals found. Wallet is clean.\n'));
      return;
    }

    const unlimitedCount = approvals.filter(a => a.isUnlimited).length;
    const divider        = chalk.gray('─'.repeat(70));

    console.log(chalk.bold.cyan(`\n  Active Approvals for ${address.slice(0, 10)}...${address.slice(-6)}`));
    console.log(chalk.gray(`  ${approvals.length} approval(s) — ${
      unlimitedCount > 0 ? chalk.red(`${unlimitedCount} UNLIMITED ⚠`) : chalk.green('none unlimited')
    }`));
    console.log(divider);
    console.log(chalk.gray('  #   Token     ') + chalk.gray('Spender'.padEnd(44)) + chalk.gray('Allowance'));
    console.log(divider);

    approvals.forEach((a, i) => {
      const short = `${a.spender.slice(0, 10)}...${a.spender.slice(-6)}`;
      console.log(
        `  ${chalk.gray(String(i + 1).padEnd(4))}` +
        `${chalk.white(a.symbol.slice(0, 8).padEnd(10))}` +
        `${chalk.cyan(short.padEnd(44))}` +
        `${formatAmount(a.amount, a.decimals, a.isUnlimited)}` +
        (a.isUnlimited ? chalk.red(' ⚠') : ''),
      );
    });

    console.log(divider);

    if (unlimitedCount > 0) {
      console.log(chalk.yellow(`\n  ⚠  ${unlimitedCount} UNLIMITED approval(s) — these spenders can drain your tokens at any time.`));
    }

    await syncActivity('APPROVE_SCAN', { address }, `${approvals.length} approvals, ${unlimitedCount} unlimited`);

    if (!doRevoke) {
      console.log(chalk.gray('\n  Tip: Run with --revoke to interactively revoke approvals.\n'));
      return;
    }

    // ── Revoke flow ───────────────────────────────────────────────────────────

    if (!Vault.isSetup()) {
      console.log(chalk.yellow('\n  Wallet not configured. Run "aura setup" first.\n'));
      return;
    }

    const { masterPassword } = await inquirer.prompt([{
      type:    'password',
      name:    'masterPassword',
      message: chalk.cyan(' Enter master password to unlock wallet:'),
    }]);

    const privateKey = Vault.getKey(masterPassword);
    if (!privateKey) {
      console.log(chalk.red(' Invalid password.\n'));
      return;
    }

    const choices = approvals.map((a, i) => ({
      name:    `${a.isUnlimited ? '⚠  ' : '   '}${a.symbol.padEnd(8)} → ${a.spender.slice(0, 10)}...  (${a.isUnlimited ? 'UNLIMITED' : formatUnits(a.amount, a.decimals)})`,
      value:   i,
      checked: a.isUnlimited, // pre-select unlimited approvals
    }));

    const { selected } = await inquirer.prompt([{
      type:    'checkbox',
      name:    'selected',
      message: chalk.cyan(' Select approvals to revoke (space to toggle, enter to confirm):'),
      choices,
    }]);

    if ((selected as number[]).length === 0) {
      console.log(chalk.gray('\n  No approvals selected.\n'));
      return;
    }

    console.log('');
    for (const idx of selected as number[]) {
      const a = approvals[idx];
      await revokeApproval(privateKey, a.token, a.spender, a.symbol);
    }

    console.log(chalk.green(`\n  ✓ Done. ${(selected as number[]).length} approval(s) revoked.\n`));

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`\n  Error: ${error instanceof Error ? error.message : String(error)}\n`));
  }
}