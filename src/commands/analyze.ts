import chalk from 'chalk';
import { isAddress } from 'viem';
import { buildContext } from '../core/engine/context.js';

export default async function analyzeCommand(args: string[]){
    const address = args[0];
    const devMode = args.includes("--dev");
    const jsonMode = args.includes("--json");

    if(!address || !isAddress(address)){
        console.log(chalk.red("\nInvalid address\n"));
        process.exit(1);
    }

    const context = await buildContext(address as `0x${string}`);

    if(jsonMode){
        console.log(JSON.stringify(context, null, 2));
        return;
    }

    const {info, privilege, risk} = context;

    console.log(chalk.bold.cyan("\n=== Aura Security Analysis ==="));

    // Identity
    console.log(chalk.bold("\nContract:"));
    console.log(`Address: ${chalk.cyan(info.address)}`);
    console.log(`Chain: ${chalk.cyan(info.chain)}`);
    console.log(`Proxy: ${info.isProxy ? chalk.yellow("Yes") : chalk.gray("No")}`);

    // Token
    if (info.token) {
        console.log(chalk.bold("\nToken:"));
        console.log(`Symbol: ${chalk.yellow(info.token.symbol ?? "N/A")}`);
        console.log(`Decimals: ${chalk.yellow(info.token.decimals ?? "N/A")}`);
    }
    
    // Risk Summary (Trader view)
    console.log(chalk.bold("\nRisk:"));
    console.log(`Level: ${chalk.yellow(risk.level)} (${risk.score}/100)`);

    if (!devMode) {
        console.log(chalk.bold("\nKey Signals:"));
        risk.reasons.slice(0, 5).forEach(r =>
        console.log(` - ${chalk.gray(r)}`)
        );
        return;
    }

    // Dev Deep Dive
    console.log(chalk.bold.cyan("\n=== Developer Deep Dive ==="));

    console.log("\nCapabilities:");
    privilege.capabilities.forEach(c =>
        console.log(` - ${chalk.green(c)}`)
    );

    console.log("\nRisk Breakdown:");
    console.log(` - Upgrade: ${risk.breakdown.upgrade}`);
    console.log(` - Supply: ${risk.breakdown.supply}`);
    console.log(` - Control: ${risk.breakdown.control}`);
    console.log(` - Operational: ${risk.breakdown.operational}`);
}