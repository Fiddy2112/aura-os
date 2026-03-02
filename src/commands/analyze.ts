import chalk from 'chalk';
import Conf from 'conf';
import { isAddress } from 'viem';
import { buildContext } from '../core/engine/context.js';
import { classifyContract } from '../core/engine/classifier.js';

const config = new Conf({ projectName: 'aura-os' });

export default async function analyzeCommand(args: string[]) {
    const address = args[0];
    const devMode = args.includes("--dev");
    const jsonMode = args.includes("--json");

    if (!address || !isAddress(address)) {
        console.log(chalk.red("\nError: Please provide a valid EVM address.\n"));
        process.exit(1);
    }

    const context = await buildContext(address as `0x${string}`);
    const classification = classifyContract(context);

    if (jsonMode) {
        console.log(JSON.stringify({ ...context, classification }, null, 2));
        return;
    }

    const { info, privilege, risk } = context;

    // --- SESSION INFO ---
    const user = (config.get('user_email') || config.get('user_wallet')) as string;
    if (user) {
        console.log(chalk.gray(`\nSession: ${chalk.green(user)}`));
    }

    // --- SHARED HEADER ---
    console.log(chalk.bold.cyan("=================== AURA INTELLIGENCE ==================="));
    
    // --- TRADER VIEW (HIGH LEVEL) ---
    console.log(`\n${chalk.bold("PROJECT VERDICT:")} ${chalk.yellow(classification.verdict)}`);
    console.log(`${chalk.bold("RISK RATING:")}     ${getRiskLabel(risk.level)} (${risk.score}/100)`);
    console.log(`${chalk.bold("CATEGORY:")}        ${chalk.magenta(classification.category)}`);
    console.log(`${chalk.bold("CONFIDENCE:")}      ${chalk.white(classification.confidence)}`);

    if (info.token) {
        console.log(chalk.gray(`\nToken: ${info.token.symbol} (${info.token.name || 'N/A'})`));
    }
    console.log(chalk.gray(`Network: ${info.chain}`));

    if (!devMode) {
        // Essential bullet points for Traders
        console.log(chalk.bold("\nKey Risk Signals:"));
        risk.reasons.slice(0, 3).forEach(r => console.log(` ${chalk.red("•")} ${chalk.gray(r)}`));
        
        console.log(chalk.cyan("\n💡 Use --dev for technical forensic details"));
        console.log(chalk.bold.cyan("=========================================================\n"));
        return;
    }

    // --- DEVELOPER VIEW (FORENSIC DEEP DIVE) ---
    console.log(chalk.bold.magenta("\n----------------- FORENSIC DEEP DIVE -----------------"));

    console.log(chalk.bold("\nContract Architecture:"));
    console.log(` - Profile: ${info.isProxy ? "Proxy (Upgradeable)" : "Standard Structure"}`);
    if (info.implementation) console.log(` - Implementation: ${chalk.gray(info.implementation)}`);
    console.log(` - Admin Type: ${chalk.green(privilege.ownerType)}`);
    if (privilege.owner) console.log(` - Admin Address: ${chalk.gray(privilege.owner)}`);

    console.log(chalk.bold("\nDetected Capabilities:"));
    const caps = privilege.capabilities;
    if (caps.length > 0) {
        caps.forEach(c => console.log(` ${chalk.green("+")} ${chalk.gray(c)}`));
    } else {
        console.log(chalk.gray(" - No special high-level capabilities detected"));
    }

    console.log(chalk.bold("\nRisk Breakdown (0-100):"));
    console.log(` - Upgrade Liability: ${risk.breakdown.upgrade}`);
    console.log(` - Supply Inflation:  ${risk.breakdown.supply}`);
    console.log(` - Control Power:     ${risk.breakdown.control}`);
    console.log(` - Ops Centralization: ${risk.breakdown.operational}`);

    console.log(chalk.bold("\nAll Flags:"));
    risk.reasons.forEach(r => console.log(` ${chalk.yellow("!")} ${chalk.gray(r)}`));

    console.log(chalk.bold.magenta("\n---------------------------------------------------------"));
    console.log(chalk.bold.cyan("=========================================================\n"));
}

function getRiskLabel(level: string) {
    switch (level) {
        case "LOW": return chalk.green("● LOW");
        case "MEDIUM": return chalk.yellow("● MEDIUM");
        case "HIGH": return chalk.red("● HIGH");
        case "CRITICAL": return chalk.bgRed.white(" ● CRITICAL ");
        default: return level;
    }
}