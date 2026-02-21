import chalk from "chalk";
import { isAddress } from "viem";
import { analyzePrivileges } from "../core/engine/privilege.js";
import { computeRisk } from "../core/engine/risk.js";

export default async function riskCommand(args: string[]) {
  const address = args[0];

  if (!address || !isAddress(address)) {
    console.log(chalk.red("Invalid address"));
    process.exit(1);
  }

  const privilege = await analyzePrivileges(address as `0x${string}`);
  const risk = computeRisk(privilege);

  console.log(chalk.bold.cyan("\n=== Risk Analysis ==="));
  console.log(`Score: ${chalk.yellow(risk.score)} / 100`);
  console.log(`Level: ${chalk.red(risk.level)}`);

  console.log("\nReasons:");
  risk.reasons.forEach((r) =>
    console.log(` - ${chalk.gray(r)}`)
  );
}