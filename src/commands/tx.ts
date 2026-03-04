import chalk from 'chalk';
import { getPublicClient } from '../core/blockchain/chains.js';
import { formatEther, formatUnits } from 'viem';
import { syncActivity } from '../core/utils/supabase.js';

export default async function txCommand(args: string[]) {
    const txHash = args[0] as `0x${string}`;
    const jsonMode = args.includes("--json");

    if (!txHash) {
        console.error(chalk.red('\n  Error: Transaction hash is required'));
        console.log(chalk.gray('  Usage: aura tx <hash> [--json]\n'));
        return;
    }

    if (!txHash.startsWith('0x') || txHash.length !== 66) {
        console.error(chalk.red('\n  Error: Invalid transaction hash format'));
        return;
    }

    try {
        const client = getPublicClient();
        
        console.log(chalk.gray(' Fetching transaction details...'));
        
        const [tx, receipt] = await Promise.all([
            client.getTransaction({ hash: txHash }),
            client.getTransactionReceipt({ hash: txHash })
        ]);

        if (jsonMode) {
            console.log(JSON.stringify({ tx, receipt }, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            , 2));
            return;
        }

        const status = receipt.status === 'success' ? chalk.green('SUCCESS') : chalk.red('FAILED');
        const gasUsed = receipt.gasUsed;
        const gasPrice = tx.gasPrice || receipt.effectiveGasPrice;
        const fee = gasUsed * gasPrice;

        await syncActivity("TX_INFO", { hash: txHash }, `Status: ${receipt.status}, From: ${tx.from}, Value: ${formatEther(tx.value)} ETH`);

        console.log(chalk.bold.cyan("\n=== Transaction Analysis ==="));
        console.log(chalk.white(`Status:      ${status}`));
        console.log(chalk.white(`Hash:        ${chalk.gray(tx.hash)}`));
        console.log(chalk.white(`Block:       ${chalk.yellow(receipt.blockNumber.toString())}`));
        console.log(chalk.white(`From:        ${chalk.cyan(tx.from)}`));
        console.log(chalk.white(`To:          ${tx.to ? chalk.cyan(tx.to) : chalk.magenta('Contract Creation')}`));
        console.log(chalk.white(`Value:       ${chalk.yellow(formatEther(tx.value))} ETH`));
        
        console.log(chalk.bold.cyan("\nGas & Fees:"));
        console.log(chalk.white(` - Gas Used:  ${chalk.yellow(gasUsed.toString())}`));
        console.log(chalk.white(` - Gas Price: ${chalk.yellow(formatUnits(gasPrice, 9))} Gwei`));
        console.log(chalk.white(` - Total Fee: ${chalk.red(formatEther(fee))} ETH`));

        if (receipt.logs.length > 0) {
            console.log(chalk.bold.cyan(`\nEvents (${receipt.logs.length}):`));
            receipt.logs.slice(0, 5).forEach((log, i) => {
                console.log(chalk.gray(` [${i}] Address: `) + chalk.white(log.address));
            });
            if (receipt.logs.length > 5) {
                console.log(chalk.gray(` ... and ${receipt.logs.length - 5} more logs`));
            }
        }

        console.log("");
    } catch (error) {
        console.error(chalk.red(`\n  Error: Failed to fetch transaction`));
        console.error(chalk.gray(`  ${error instanceof Error ? error.message : 'Unknown error'}\n`));
    }
}
