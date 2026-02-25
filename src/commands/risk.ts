import chalk from "chalk";
import { isAddress } from "viem";
import { analyzePrivileges } from "../core/engine/privilege.js";
import { computeRisk } from "../core/engine/risk.js";

function renderRiskBar(score: number, level: string) {
  const totalBlocks = 10;
  const filledBlocks = Math.round(score / 10);
  const emptyBlocks = totalBlocks - filledBlocks;

  const filled = "■".repeat(filledBlocks);
  const empty = "□".repeat(emptyBlocks);

  const bar =
    level === "LOW"
      ? chalk.green(filled)
      : level === "MEDIUM"
      ? chalk.yellow(filled)
      : level === "HIGH"
      ? chalk.red(filled)
      : chalk.bgRed.white(filled);

  return `[${bar}${chalk.gray(empty)}] ${score}%`;
}

export default async function riskCommand(args: string[]) {
  const address = args[0];
  const devMode = args.includes("--dev");
  const jsonMode = args.includes("--json");

  if (!address || !isAddress(address)) {
    console.log(chalk.red("\nInvalid address\n"));
    process.exit(1);
  }

  const privilege = await analyzePrivileges(address as `0x${string}`);
  const risk = computeRisk(privilege);

  if (jsonMode) {
    console.log(JSON.stringify(risk, null, 2));
    return;
  }

  const levelColor =
    risk.level === "LOW"
      ? chalk.green
      : risk.level === "MEDIUM"
      ? chalk.yellow
      : risk.level === "HIGH"
      ? chalk.red
      : chalk.bgRed.white;

  console.log(chalk.bold.cyan("\n=== Risk Assessment ==="));
  console.log(chalk.bold("\nRisk Level: ") + levelColor(risk.level));
  console.log(renderRiskBar(risk.score, risk.level));

  // TRADER MODE (default)

  if (!devMode) {
    console.log(chalk.bold("\nSummary:"));

    const topReasons = risk.reasons.slice(0, 5);

    if (topReasons.length === 0) {
      console.log(chalk.gray(" - No major risk signals detected"));
    } else {
      topReasons.forEach((r) =>
        console.log(` - ${chalk.gray(r)}`)
      );
    }

    return;
  }

  // DEV MODE

  console.log(chalk.bold.cyan("\nBreakdown:"));
  console.log(` - Upgrade Risk: ${chalk.yellow(risk.breakdown.upgrade)}`);
  console.log(` - Supply Risk: ${chalk.yellow(risk.breakdown.supply)}`);
  console.log(` - Control Risk: ${chalk.yellow(risk.breakdown.control)}`);
  console.log(` - Operational Risk: ${chalk.yellow(risk.breakdown.operational)}`);

  console.log(chalk.bold("\nReasons:"));
  if (risk.reasons.length === 0) {
    console.log(chalk.gray(" - None"));
  } else {
    risk.reasons.forEach((r) =>
      console.log(` - ${chalk.gray(r)}`)
    );
  }
}