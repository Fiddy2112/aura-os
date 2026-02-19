import chalk from 'chalk';
import { isAddress } from 'viem';
import { analyzePrivileges } from "../core/engine/privilege.js";

export default async function privilegeCommand(args: string[]) {
  const address = args[0];
  const jsonMode = args.includes("--json");

  if (!address) {
    console.error(chalk.red("\n  Error: Contract address is required"));
    console.log(chalk.gray("  Usage: aura privilege <address> [--json]\n"));
    process.exit(1);
  }

  if (!isAddress(address)) {
    console.error(chalk.red(`\n  Error: Invalid Ethereum address: ${address}`));
    console.log(chalk.gray("  Address must be a valid 0x-prefixed hex string (42 characters)\n"));
    process.exit(1);
  }

  try {
    const result = await analyzePrivileges(address as `0x${string}`);

    if (jsonMode) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.bold.cyan("\n=== Privilege Analysis ==="));
    console.log(chalk.white("Capabilities:"));
    if (result.capabilities.length === 0) {
        console.log(chalk.gray(" - None detected"));
    } else {
        result.capabilities.forEach((cap) =>
        console.log(chalk.white(` - ${cap}`))
    );
    }

    console.log(chalk.white("\nRisk Flags:"));
    if (result.riskFlags.length === 0) {
      console.log(chalk.gray(" - None detected"));
    } else {
      result.riskFlags.forEach((flag) => console.log(chalk.yellow(` - ${flag}`)));
    }

    if (result.isProxy) {
      console.log(chalk.white(`\nProxy Implementation: ${chalk.cyan(result.implementation)}`));
    }

    if (result.owner) {
      console.log(chalk.white(`\nOwner: ${chalk.cyan(result.owner)}`));
    }
      
    if (result.isRenounced) {
      console.log(chalk.yellow("Ownership: Renounced"));
    }
  } catch (error) {
    console.error(chalk.red("\n  Error: Failed to analyze privileges"));
    console.error(chalk.gray(`  ${error instanceof Error ? error.message : "Unknown error"}\n`));
    process.exit(1);
  }
}
