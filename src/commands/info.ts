import chalk from 'chalk';
import { isAddress } from 'viem';
import { AIInterpreter } from "../core/ai/interpreter.js";
import { getContractInfo } from "../core/engine/info.js";

export default async function infoCommand(args: string[]) {
    const address = args[0];
    const jsonMode = args.includes("--json");
    const explainMode = args.includes("--explain");

    if (!address) {
        console.error(chalk.red('\n  Error: Contract address is required'));
        console.log(chalk.gray('  Usage: aura info <address> [--json] [--explain]\n'));
        process.exit(1);
    }

    if (!isAddress(address)) {
        console.error(chalk.red(`\n  Error: Invalid Ethereum address: ${address}`));
        console.log(chalk.gray('  Address must be a valid 0x-prefixed hex string (42 characters)\n'));
        process.exit(1);
    }

    try {
        const result = await getContractInfo(address as `0x${string}`);

        if (jsonMode) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }

        console.log(chalk.bold.cyan("\n=== Contract Info ==="));
        console.log(chalk.white(`Address: ${chalk.cyan(result.address)}`));
        console.log(chalk.white(`Chain: ${chalk.cyan(result.chain)}`));
        console.log(chalk.white(`Is Contract: ${result.isContract ? chalk.green('Yes') : chalk.red('No')}`));
        console.log(chalk.white(`Code Size: ${chalk.yellow(result.codeSize)} bytes`));
        
        if (result.bytecodeHash) {
            console.log(chalk.white(`Bytecode Hash: ${chalk.gray(result.bytecodeHash)}`));
        }
        
        console.log(chalk.white(`Proxy: ${result.isProxy ? chalk.yellow('Yes') : chalk.gray('No')}`));

        if (result.implementation) {
            console.log(chalk.white(`Implementation: ${chalk.cyan(result.implementation)}`));
        }

        if (explainMode) {
            const interpreter = new AIInterpreter();
            console.log(chalk.bold.cyan("\n=== AI Explanation ==="));
            const explanation = await interpreter.explainContract(result);
            console.log(explanation);
        }
    } catch (error) {
        console.error(chalk.red(`\n  Error: Failed to get contract info`));
        console.error(chalk.gray(`  ${error instanceof Error ? error.message : 'Unknown error'}\n`));
        process.exit(1);
    }
}