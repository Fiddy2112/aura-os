import chalk from 'chalk';
import { getPublicClient } from '../core/blockchain/chains.js';
import { formatEther, formatUnits } from 'viem';
import { syncActivity } from '../core/utils/supabase.js';
import { lookupSelector } from '../core/engine/selector-db.js';

export default async function txCommand(args: string[]) {
  const txHash  = args[0] as `0x${string}`;
  const jsonMode = args.includes('--json');

  if (!txHash) {
    console.error(chalk.red('\n  Error: Transaction hash is required'));
    console.log(chalk.gray('  Usage: aura tx <hash> [--json]\n'));
    return;
  }

  if (!txHash.startsWith('0x') || txHash.length !== 66) {
    console.error(chalk.red('\n  Error: Invalid transaction hash (must be 0x + 64 hex chars)\n'));
    return;
  }

  const client = getPublicClient();
  console.log(chalk.gray('\n Fetching transaction details...'));

  try {
    // Fetch tx first — if pending, receipt won't exist yet
    const tx = await client.getTransaction({ hash: txHash });

    // ── Pending tx ────────────────────────────────────────────────────────────
    if (tx.blockNumber === null) {
      if (jsonMode) {
        console.log(JSON.stringify(tx, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
        return;
      }

      console.log(chalk.bold.cyan('\n=== Transaction (Pending) ==='));
      console.log(chalk.yellow(' Status:  PENDING — not yet mined'));
      console.log(chalk.white(` Hash:    ${chalk.gray(tx.hash)}`));
      console.log(chalk.white(` From:    ${chalk.cyan(tx.from)}`));
      console.log(chalk.white(` To:      ${tx.to ? chalk.cyan(tx.to) : chalk.magenta('Contract Creation')}`));
      console.log(chalk.white(` Value:   ${chalk.yellow(formatEther(tx.value))} ETH`));
      if (tx.gasPrice) {
        console.log(chalk.white(` Gas Price: ${chalk.yellow(formatUnits(tx.gasPrice, 9))} Gwei`));
      }
      if (tx.input && tx.input !== '0x') {
        const sig = lookupSelector(tx.input.slice(0, 10));
        console.log(chalk.white(` Function: ${chalk.magenta(sig)}`));
      }
      console.log('');
      return;
    }

    // ── Confirmed tx ──────────────────────────────────────────────────────────
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    if (jsonMode) {
      console.log(JSON.stringify(
        { tx, receipt },
        (_, v) => typeof v === 'bigint' ? v.toString() : v,
        2,
      ));
      return;
    }

    const status   = receipt.status === 'success' ? chalk.green('✓ SUCCESS') : chalk.red('✗ FAILED');
    const gasUsed  = receipt.gasUsed;
    const gasPrice = tx.gasPrice ?? receipt.effectiveGasPrice ?? 0n;
    const fee      = gasUsed * gasPrice;

    // ── Decode calldata selector ──────────────────────────────────────────────
    let functionLabel: string | null = null;
    if (tx.input && tx.input.length >= 10 && tx.input !== '0x') {
      functionLabel = lookupSelector(tx.input.slice(0, 10));
    }

    await syncActivity(
      'TX_INFO',
      { hash: txHash },
      `Status: ${receipt.status}, From: ${tx.from}, Value: ${formatEther(tx.value)} ETH`,
    );

    const divider = '─'.repeat(50);
    console.log(chalk.bold.cyan('\n=== Transaction Analysis ==='));
    console.log(chalk.white(`Status:    ${status}`));
    console.log(chalk.white(`Hash:      ${chalk.gray(tx.hash)}`));
    console.log(chalk.white(`Block:     ${chalk.yellow(receipt.blockNumber.toString())}`));
    console.log(chalk.white(`From:      ${chalk.cyan(tx.from)}`));
    console.log(chalk.white(`To:        ${tx.to ? chalk.cyan(tx.to) : chalk.magenta('Contract Creation')}`));
    console.log(chalk.white(`Value:     ${chalk.yellow(formatEther(tx.value))} ETH`));
    if (functionLabel) {
      console.log(chalk.white(`Function:  ${chalk.magenta(functionLabel)}`));
    }

    console.log(chalk.bold.cyan('\nGas & Fees:'));
    console.log(chalk.white(` Gas Used:   ${chalk.yellow(gasUsed.toLocaleString())}`));
    console.log(chalk.white(` Gas Price:  ${chalk.yellow(formatUnits(gasPrice, 9))} Gwei`));
    console.log(chalk.white(` Total Fee:  ${chalk.red(formatEther(fee))} ETH`));

    if (receipt.logs.length > 0) {
      console.log(chalk.bold.cyan(`\nEvents (${receipt.logs.length}):`));
      receipt.logs.slice(0, 5).forEach((log: any, i) => {
        const topic0 = log.topics?.[0];
        console.log(
          chalk.gray(` [${i}] `) +
          chalk.white(log.address) +
          (topic0 ? chalk.gray(`  topic: ${topic0.slice(0, 10)}...`) : '')
        );
      });
      if (receipt.logs.length > 5) {
        console.log(chalk.gray(`  ... and ${receipt.logs.length - 5} more events`));
      }
    }

    console.log('');

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    // Friendlier message for "tx not found"
    if (msg.includes('could not be found') || msg.includes('Transaction not found')) {
      console.error(chalk.red(`\n  Transaction not found.`));
      console.error(chalk.gray(`  Make sure you are on the correct chain. Use "aura chain" to check.\n`));
    } else {
      console.error(chalk.red(`\n  Error: ${msg}\n`));
    }
  }
}