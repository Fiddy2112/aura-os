import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import { isAddress, isHex } from 'viem';
import { getPublicClient, getCurrentChain } from '../core/blockchain/chains.js';
import { simulateCall } from '../core/engine/simulate.js';

// ── Tenderly simulation ───────────────────────────────────────────────────────

interface TenderlyResult {
  success:       boolean;
  gasUsed:       number;
  stateChanges:  { contract: string; key: string; before: string; after: string }[];
  balanceChanges: { address: string; before: string; after: string; diff: string }[];
  logs:          { name: string; inputs: { name: string; value: string }[] }[];
  errorMessage?: string;
}

async function simulateViaTenderly(
  from:  string,
  to:    string,
  data:  string,
  value: string,
  chainId: number,
): Promise<TenderlyResult | null> {
  const user    = process.env.TENDERLY_USER;
  const project = process.env.TENDERLY_PROJECT;
  const apiKey  = process.env.TENDERLY_API_KEY;

  if (!user || !project || !apiKey) return null;

  try {
    const res = await axios.post(
      `https://api.tenderly.co/api/v1/account/${user}/project/${project}/simulate`,
      {
        network_id:       String(chainId),
        from, to,
        input:            data,
        value:            value || '0',
        save:             false,
        save_if_fails:    false,
        simulation_type:  'full',
      },
      {
        headers: { 'X-Access-Key': apiKey, 'Content-Type': 'application/json' },
        timeout: 15000,
      },
    );

    const sim = res.data.transaction;
    const stateChanges: TenderlyResult['stateChanges'] = [];
    const balanceChanges: TenderlyResult['balanceChanges'] = [];

    // Parse state diffs
    for (const [contract, diff] of Object.entries(res.data.transaction?.transaction_info?.state_diff ?? {})) {
      for (const [key, change] of Object.entries(diff as any)) {
        stateChanges.push({
          contract, key,
          before: (change as any).original ?? '0x0',
          after:  (change as any).dirty    ?? '0x0',
        });
      }
    }

    // Parse balance diffs
    for (const [addr, diff] of Object.entries(res.data.transaction?.transaction_info?.balance_diff ?? {})) {
      const before = BigInt((diff as any).original ?? '0');
      const after  = BigInt((diff as any).dirty    ?? '0');
      const diffVal = after - before;
      balanceChanges.push({
        address: addr,
        before:  before.toString(),
        after:   after.toString(),
        diff:    (diffVal >= 0n ? '+' : '') + diffVal.toString(),
      });
    }

    // Parse logs
    const logs = (res.data.transaction?.transaction_info?.logs ?? []).map((l: any) => ({
      name:   l.name ?? 'Unknown',
      inputs: (l.inputs ?? []).map((i: any) => ({ name: i.soltype?.name ?? 'unknown', value: String(i.value) })),
    }));

    return {
      success:       sim?.status ?? false,
      gasUsed:       sim?.gas_used ?? 0,
      stateChanges,
      balanceChanges,
      logs,
      errorMessage:  sim?.error_message,
    };
  } catch { return null; }
}

// ── Fetch tx calldata by hash ─────────────────────────────────────────────────

async function getTxData(hash: `0x${string}`) {
  const client = getPublicClient();
  const tx = await client.getTransaction({ hash });
  return {
    from:  tx.from,
    to:    tx.to ?? '',
    data:  tx.input,
    value: tx.value.toString(),
  };
}

// ── Display ───────────────────────────────────────────────────────────────────

function displayResult(result: TenderlyResult, source: string): void {
  const divider = chalk.gray('─'.repeat(56));
  const status  = result.success ? chalk.green('✓ SUCCESS') : chalk.red('✗ REVERTED');

  console.log(chalk.bold.cyan(`\n  Simulation Result  ${chalk.gray(`[${source}]`)}`));
  console.log(divider);
  console.log(`  ${chalk.gray('Status:')}   ${status}`);
  console.log(`  ${chalk.gray('Gas Used:')} ${chalk.yellow(result.gasUsed.toLocaleString())}`);
  if (result.errorMessage) {
    console.log(`  ${chalk.gray('Error:')}    ${chalk.red(result.errorMessage)}`);
  }

  if (result.balanceChanges.length > 0) {
    console.log(chalk.bold.white('\n  Balance Changes:'));
    for (const bc of result.balanceChanges) {
      const isPositive = bc.diff.startsWith('+');
      const color      = isPositive ? chalk.green : chalk.red;
      const addr       = `${bc.address.slice(0, 10)}...${bc.address.slice(-6)}`;
      console.log(`  ${chalk.gray(addr)}  ${color(bc.diff)} wei`);
    }
  }

  if (result.stateChanges.length > 0) {
    console.log(chalk.bold.white(`\n  State Changes (${Math.min(result.stateChanges.length, 10)} shown):`));
    for (const sc of result.stateChanges.slice(0, 10)) {
      const addr = `${sc.contract.slice(0, 10)}...`;
      const key  = sc.key.slice(0, 18) + '...';
      console.log(`  ${chalk.gray(addr)}  ${chalk.gray('slot')} ${chalk.cyan(key)}`);
      console.log(`    ${chalk.red(sc.before.slice(0, 20) + '...')} → ${chalk.green(sc.after.slice(0, 20) + '...')}`);
    }
    if (result.stateChanges.length > 10) {
      console.log(chalk.gray(`  ... and ${result.stateChanges.length - 10} more`));
    }
  }

  if (result.logs.length > 0) {
    console.log(chalk.bold.white(`\n  Events (${result.logs.length}):`));
    for (const log of result.logs) {
      console.log(`  ${chalk.magenta(log.name)}`);
      for (const inp of log.inputs) {
        console.log(`    ${chalk.gray(inp.name + ':')} ${chalk.white(String(inp.value).slice(0, 60))}`);
      }
    }
  }

  console.log('');
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function simulateCommand(args: string[]): Promise<void> {
  // Usage: aura simulate <tx-hash>
  //        aura simulate <to> --from <from> --data <calldata> [--value <wei>]
  if (args.length === 0 || args[0] === '--help') {
    console.log(chalk.bold.cyan('\n  aura simulate <tx-hash | contract-address>\n'));
    console.log(chalk.gray('  Preview transaction state changes without broadcasting.\n'));
    console.log(chalk.gray('  Modes:'));
    console.log(chalk.gray('    aura simulate <tx-hash>              — re-simulate existing tx'));
    console.log(chalk.gray('    aura simulate <to> --from <addr> --data <hex> [--value <wei>]'));
    console.log(chalk.gray('\n  Requires TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_API_KEY in .env'));
    console.log(chalk.gray('  for full state diff. Without keys, uses local eth_call simulation.\n'));
    return;
  }

  const input    = args[0];
  const jsonMode = args.includes('--json');
  const chain    = getCurrentChain();

  // Parse flags
  const fromIdx  = args.indexOf('--from');
  const dataIdx  = args.indexOf('--data');
  const valueIdx = args.indexOf('--value');
  const fromAddr = fromIdx  !== -1 ? args[fromIdx  + 1] : undefined;
  const callData = dataIdx  !== -1 ? args[dataIdx  + 1] : undefined;
  const ethValue = valueIdx !== -1 ? args[valueIdx + 1] : '0';

  const spinner = ora(chalk.cyan(' Simulating...')).start();

  try {
    // ── tx hash ───────────────────────────────────────────────────────
    if (input.startsWith('0x') && input.length === 66) {
      const txData = await getTxData(input as `0x${string}`);
      const result = await simulateViaTenderly(txData.from, txData.to, txData.data, txData.value, chain.id);
      spinner.stop();

      if (!result) {
        console.log(chalk.yellow('\n  Tenderly not configured. Set TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_API_KEY in .env\n'));
        console.log(chalk.gray('  For basic simulation, use: aura call <contract> <method>\n'));
        return;
      }

      if (jsonMode) { console.log(JSON.stringify(result, null, 2)); return; }
      displayResult(result, `tx: ${input.slice(0, 12)}...`);
      return;
    }

    // ── manual payload ────────────────────────────────────────────────
    if (isAddress(input) && fromAddr && callData) {
      const result = await simulateViaTenderly(fromAddr, input, callData, ethValue, chain.id);
      spinner.stop();

      if (!result) {
        // Fallback: basic eth_call via viem
        console.log(chalk.yellow('\n  Tenderly not configured — running basic eth_call simulation...\n'));

        try {
          const client = getPublicClient();
          await client.call({
            account: fromAddr as `0x${string}`,
            to: input as `0x${string}`,
            data: callData as `0x${string}`,
            value: BigInt(ethValue),
          });
          console.log(`  ${chalk.gray('Result:')} ${chalk.green('success')}`);
        } catch (error) {
          console.log(`  ${chalk.gray('Result:')} ${chalk.red('reverted')}`);
          const msg = error instanceof Error ? error.message : String(error);
          const revertMatch = msg.match(/reason:\s*(.+?)(?:\n|$)/i)
            ?? msg.match(/reverted with reason string '(.+?)'/i)
            ?? msg.match(/execution reverted[:\s]*(.+)/i);
          const revertReason = revertMatch?.[1]?.trim() ?? msg.slice(0, 200);
          console.log(`  ${chalk.red(revertReason)}`);
        }
        console.log('');
        return;
      }

      if (jsonMode) { console.log(JSON.stringify(result, null, 2)); return; }
      displayResult(result, 'custom payload');
      return;
    }

    spinner.stop();
    console.error(chalk.red('\n  Provide a tx hash, or: <contract> --from <addr> --data <hex>\n'));

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`\n  Error: ${error instanceof Error ? error.message : String(error)}\n`));
  }
}