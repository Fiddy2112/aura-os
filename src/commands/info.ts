import chalk from 'chalk';
import { isAddress } from 'viem';
import { AIInterpreter } from "../core/ai/interpreter.js";
import { getContractInfo } from "../core/engine/info.js";
import { formatSupply } from '../core/utils/helpers.js';

export default async function infoCommand(args: string[]) {
    const address = args[0];
    const jsonMode = args.includes("--json");
    const explainMode = args.includes("--explain");
    const devMode = args.includes("--dev");

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
        console.log(chalk.white(`Is Contract: ${result.isContract ? chalk.green("Yes") : chalk.red("No")}`));

        //TOKEN (Trader important)

        if (result.token) {
            console.log(chalk.bold.cyan("\nToken:"));
            if (result.token.name)
            console.log(chalk.white(` - Name: ${chalk.yellow(result.token.name)}`));
            if (result.token.symbol)
            console.log(chalk.white(` - Symbol: ${chalk.yellow(result.token.symbol)}`));
            if (result.token.decimals !== undefined)
            console.log(chalk.white(` - Decimals: ${chalk.yellow(result.token.decimals)}`));
            if (result.token.totalSupply && result.token.decimals !== undefined)
            console.log(chalk.white(` - Total Supply: ${chalk.yellow(formatSupply(result.token.totalSupply, result.token.decimals))}`));
        }

        // DEPLOYMENT

        if (result.deployment) {
            console.log(chalk.bold.cyan("\nDeployment:"));
            console.log(chalk.white(` - Age: ${chalk.yellow(result.deployment.ageInDays)} days`));
        }

        // PROXY

        if(devMode){
            console.log(chalk.bold.cyan("\nProxy:"));
            console.log(chalk.white(` - Is Proxy: ${result.isProxy ? chalk.yellow("Yes") : chalk.gray("No")}`));
            if (devMode && result.proxyType)
            console.log(chalk.white(` - Type: ${chalk.yellow(result.proxyType)}`));
            if (devMode && result.implementation)
            console.log(chalk.white(` - Implementation: ${chalk.cyan(result.implementation)}`));
        }

        // STANDARDS

        if (devMode) {
            console.log(chalk.bold.cyan("\nStandards:"));
            Object.entries(result.standards).forEach(([key, value]) => {
                console.log(
                    chalk.white(` - ${key}: ${value ? chalk.green("YES") : chalk.gray("NO")}`)
                );
            });
        }

        // STABLECOIN

        if (devMode && result.stablecoinProfile) {
            console.log(chalk.bold.cyan("\nStablecoin Profile:"));
            console.log(
            chalk.white(
                ` - Stablecoin-like: ${
                result.stablecoinProfile.isStablecoinLike
                    ? chalk.green("YES")
                    : chalk.gray("NO")
                }`
            )
            );
            console.log(
            chalk.white(
                ` - Blacklist: ${
                result.stablecoinProfile.hasBlacklist
                    ? chalk.yellow("YES")
                    : chalk.gray("NO")
                }`
            )
            );
        }

        // TRANSFER RESTRICTIONS

        if (devMode && result.antiWhaleProfile) {
            console.log(chalk.bold.cyan("\nTransfer Restrictions:"));
            console.log(
            chalk.white(
                ` - MaxTx: ${
                result.antiWhaleProfile.hasMaxTxFunction
                    ? chalk.yellow("YES")
                    : chalk.gray("NO")
                }`
            )
            );
            console.log(
            chalk.white(
                ` - Trading Toggle: ${
                result.antiWhaleProfile.hasTradingToggle
                    ? chalk.yellow("YES")
                    : chalk.gray("NO")
                }`
            )
            );
        }

        // DEV FORENSIC VIEW

        if (devMode) {
            console.log(chalk.bold.cyan("\n=== Developer / Forensic View ==="));
        
            console.log(chalk.white(`Bytecode Hash: ${chalk.gray(result.bytecodeHash ?? "N/A")}`));
            console.log(chalk.white(`Code Size: ${chalk.yellow(result.codeSize)} bytes`));
            console.log(chalk.white(`Selector Count: ${chalk.yellow(result.selectorCount)}`));
            console.log(chalk.white(`Unique Opcode Count: ${chalk.yellow(result.uniqueOpcodeCount)}`));
        
            console.log(chalk.white(`Delegatecall: ${result.hasDelegateCall ? chalk.yellow("YES") : chalk.gray("NO")}`));
            console.log(chalk.white(`Selfdestruct: ${result.hasSelfDestruct ? chalk.red("YES") : chalk.gray("NO")}`));
            console.log(chalk.white(`Create: ${result.hasCreate ? chalk.yellow("YES") : chalk.gray("NO")}`));
            console.log(chalk.white(`Create2: ${result.hasCreate2 ? chalk.yellow("YES") : chalk.gray("NO")}`));
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