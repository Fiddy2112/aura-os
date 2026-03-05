import chalk from "chalk";
import { isAddress } from "viem";
import { analyzePrivileges } from "../core/engine/privilege.js";
import { computeRisk } from "../core/engine/risk.js";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

function levelColor(level: RiskLevel) {
  return level === "LOW"      ? chalk.green
       : level === "MEDIUM"   ? chalk.yellow
       : level === "HIGH"     ? chalk.red
       : chalk.bgRed.white;
}

function renderRiskBar(score: number, level: RiskLevel) {
  const total   = 10;
  const filled  = Math.round(score / 10);
  const empty   = total - filled;
  const bar     = levelColor(level)("■".repeat(filled)) + chalk.gray("□".repeat(empty));
  return `[${bar}] ${score}%`;
}

export default async function riskCommand(args: string[]) {
  const address = args[0];
  const devMode  = args.includes("--dev");
  const jsonMode = args.includes("--json");

  if (!address) {
    console.error(chalk.red("\n  Error: Contract address is required"));
    console.log(chalk.gray("  Usage: aura risk <address> [--dev] [--json]\n"));
    process.exit(1);
  }

  if (!isAddress(address)) {
    console.error(chalk.red(`\n  Error: Invalid Ethereum address: ${address}\n`));
    process.exit(1);
  }

  try {
    const privilege = await analyzePrivileges(address as `0x${string}`);
    const risk = computeRisk(privilege);

    if (jsonMode) {
      console.log(JSON.stringify(risk, null, 2));
      return;
    }

    const color = levelColor(risk.level as RiskLevel);

    console.log(chalk.bold.cyan("\n=== Risk Assessment ==="));
    console.log(chalk.bold("\nRisk Level : ") + color(risk.level));
    console.log(renderRiskBar(risk.score, risk.level as RiskLevel));

    // ── TRADER MODE (default) ─────────────────────────────────────────────────
    if (!devMode) {
      console.log(chalk.bold("\nSummary:"));
      const topReasons = risk.reasons.slice(0, 5);

      if (topReasons.length === 0) {
        console.log(chalk.gray(" - No major risk signals detected"));
      } else {
        topReasons.forEach(r => console.log(chalk.gray(` - ${r}`)));
      }

      console.log('');
      return;
    }

    // ── DEV MODE ──────────────────────────────────────────────────────────────
    console.log(chalk.bold.cyan("\nBreakdown:"));
    console.log(` - Upgrade Risk     : ${chalk.yellow(risk.breakdown.upgrade)}`);
    console.log(` - Supply Risk      : ${chalk.yellow(risk.breakdown.supply)}`);
    console.log(` - Control Risk     : ${chalk.yellow(risk.breakdown.control)}`);
    console.log(` - Operational Risk : ${chalk.yellow(risk.breakdown.operational)}`);

    console.log(chalk.bold("\nReasons:"));
    if (risk.reasons.length === 0) {
      console.log(chalk.gray(" - None"));
    } else {
      risk.reasons.forEach(r => console.log(chalk.gray(` - ${r}`)));
    }
    console.log('');

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  Error: ${msg}\n`));
    process.exit(1);
  }
}