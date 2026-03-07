import chalk from 'chalk';
import { isAddress } from 'viem';
import { getPublicClient } from '../core/blockchain/chains.js';
import { analyzePrivileges } from '../core/engine/privilege.js';
import { computeRisk } from '../core/engine/risk.js';
import { AIInterpreter } from '../core/ai/interpreter.js';
import { syncActivity } from '../core/utils/supabase.js';

// ── Vulnerability pattern library ─────────────────────────────────────────────
// Each entry: selector (4-byte hex without 0x) + description + severity
const VULN_PATTERNS: Array<{ selector: string; label: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' }> = [
  // Dangerous admin functions
  { selector: '6198e339', label: 'setOwner(address) — ownership takeover risk',    severity: 'HIGH'     },
  { selector: 'f2fde38b', label: 'transferOwnership(address) — owner transfer',    severity: 'MEDIUM'   },
  { selector: '715018a6', label: 'renounceOwnership() — irrevocable lock risk',    severity: 'MEDIUM'   },
  // Supply manipulation
  { selector: '40c10f19', label: 'mint(address,uint256) — unlimited supply risk',  severity: 'HIGH'     },
  { selector: '9dc29fac', label: 'burn(address,uint256) — forced burn risk',       severity: 'HIGH'     },
  // Pause / freeze
  { selector: '8456cb59', label: 'pause() — contract can be frozen',               severity: 'MEDIUM'   },
  { selector: '3f4ba83a', label: 'unpause()',                                       severity: 'LOW'      },
  // Blacklist / whitelist
  { selector: 'f9f92be4', label: 'blacklist(address) — censorship capability',     severity: 'HIGH'     },
  { selector: '10c16e46', label: 'addToBlacklist(address)',                         severity: 'HIGH'     },
  // Upgrade
  { selector: '3659cfe6', label: 'upgradeTo(address) — proxy upgrade risk',        severity: 'CRITICAL' },
  { selector: '4f1ef286', label: 'upgradeToAndCall(address,bytes)',                 severity: 'CRITICAL' },
  // Fee manipulation
  { selector: '6c19e783', label: 'setTax / setFee — fee rug risk',                 severity: 'HIGH'     },
  { selector: 'e0d443ef', label: 'setMaxTxAmount — whale restriction',             severity: 'MEDIUM'   },
  // Selfdestruct
  { selector: '41c0e1b5', label: 'kill() / selfdestruct — contract destruction',   severity: 'CRITICAL' },
];

interface AuditFinding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  label: string;
  detail?: string;
}

interface AuditResult {
  address: string;
  score: number;         // 0 (safe) → 100 (critical)
  grade: string;         // A+ → F
  findings: AuditFinding[];
  aiSummary?: string;
}

function bytecodeHas(bytecode: string, selector: string): boolean {
  return bytecode.toLowerCase().includes(selector.toLowerCase());
}

function scoreToGrade(score: number): string {
  if (score === 0)  return 'A+';
  if (score <= 10)  return 'A';
  if (score <= 25)  return 'B';
  if (score <= 45)  return 'C';
  if (score <= 65)  return 'D';
  return 'F';
}

const SEVERITY_WEIGHT = { CRITICAL: 30, HIGH: 15, MEDIUM: 7, LOW: 2, INFO: 0 };
const SEVERITY_COLOR  = {
  CRITICAL: chalk.bgRed.white,
  HIGH:     chalk.red,
  MEDIUM:   chalk.yellow,
  LOW:      chalk.gray,
  INFO:     chalk.blue,
};

// ─────────────────────────────────────────────────────────────────────────────

export default async function auditCommand(args: string[]) {
  const address  = args[0];
  const jsonMode = args.includes('--json');
  const noAI     = args.includes('--no-ai');

  if (!address) {
    console.error(chalk.red('\n  Error: Contract address is required'));
    console.log(chalk.gray('  Usage: aura audit <address> [--json] [--no-ai]\n'));
    process.exit(1);
  }

  if (!isAddress(address)) {
    console.error(chalk.red(`\n  Error: Invalid address: ${address}\n`));
    process.exit(1);
  }

  const client = getPublicClient();

  console.log(chalk.gray(`\n Running security audit on ${address}...`));

  try {
    // ── 1. Bytecode scan ──────────────────────────────────────────────────
    const code = await client.getCode({ address: address as `0x${string}` });
    if (!code || code === '0x') {
      console.error(chalk.red('\n  Error: No contract found at this address\n'));
      process.exit(1);
    }

    const findings: AuditFinding[] = [];

    console.log(chalk.gray(' [1/3] Scanning bytecode patterns...'));
    for (const pattern of VULN_PATTERNS) {
      if (bytecodeHas(code, pattern.selector)) {
        findings.push({ severity: pattern.severity, label: pattern.label });
      }
    }

    // ── 2. Privilege + risk analysis ──────────────────────────────────────
    console.log(chalk.gray(' [2/3] Analyzing privilege surface...'));
    const privilege = await analyzePrivileges(address as `0x${string}`);
    const risk      = computeRisk(privilege);

    // Map risk flags to findings
    if (privilege.isProxy) {
      findings.push({ severity: 'HIGH', label: 'Proxy pattern detected — logic can be replaced', detail: privilege.implementation });
    }
    if (!privilege.isRenounced && privilege.owner) {
      findings.push({ severity: 'MEDIUM', label: `Active owner: ${privilege.owner}` });
    }
    if (privilege.isRenounced) {
      findings.push({ severity: 'INFO', label: 'Ownership renounced — immutable admin state' });
    }

    // ── 3. Compute score ──────────────────────────────────────────────────
    const rawScore = findings.reduce((s, f) => s + SEVERITY_WEIGHT[f.severity], 0);
    const score    = Math.min(rawScore, 100);
    const grade    = scoreToGrade(score);

    // ── 4. AI summary ─────────────────────────────────────────────────────
    let aiSummary: string | undefined;
    if (!noAI && findings.length > 0) {
      console.log(chalk.gray(' [3/3] Generating AI narrative...'));
      try {
        const interpreter = new AIInterpreter();
        const prompt = `You are a smart contract security auditor. Given these findings for contract ${address}:

        ${findings.map(f => `[${f.severity}] ${f.label}${f.detail ? ` (${f.detail})` : ''}`).join('\n')}

        Risk Score: ${score}/100 (Grade: ${grade})

        Write a concise 3-5 sentence security summary. Be direct, mention the most critical risks first, and give one actionable recommendation. No markdown, plain text only.`;
        aiSummary = await interpreter.chat(prompt);
      } catch {
        aiSummary = undefined;
      }
    }

    const result: AuditResult = { address, score, grade, findings, aiSummary };

    // ── JSON output ───────────────────────────────────────────────────────
    if (jsonMode) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    // ── Display ───────────────────────────────────────────────────────────
    const gradeColor =
      grade === 'A+' || grade === 'A' ? chalk.green.bold :
      grade === 'B'                   ? chalk.cyan.bold  :
      grade === 'C'                   ? chalk.yellow.bold :
      grade === 'D'                   ? chalk.red.bold   :
                                        chalk.bgRed.white.bold;

    const divider = '═'.repeat(60);
    console.log(chalk.bold.cyan(`\n${divider}`));
    console.log(chalk.bold.cyan('  🔐 AURA SECURITY AUDIT'));
    console.log(chalk.bold.cyan(divider));
    console.log(chalk.white(` Address : ${chalk.gray(address)}`));
    console.log(chalk.white(` Score   : ${score}/100`));
    console.log(chalk.white(` Grade   : ${gradeColor(grade)}`));
    console.log(chalk.gray(divider));

    if (findings.length === 0) {
      console.log(chalk.green('\n ✓ No vulnerability patterns detected.'));
    } else {
      console.log(chalk.bold(`\n Findings (${findings.length}):\n`));
      const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
      for (const sev of order) {
        const group = findings.filter(f => f.severity === sev);
        if (group.length === 0) continue;
        group.forEach(f => {
          const tag   = SEVERITY_COLOR[sev](` ${sev} `.padEnd(10));
          const detail = f.detail ? chalk.gray(` → ${f.detail.slice(0, 40)}`) : '';
          console.log(` ${tag} ${chalk.white(f.label)}${detail}`);
        });
      }
    }

    if (aiSummary) {
      console.log(chalk.bold.cyan(`\n AI Summary:\n`));
      console.log(chalk.white(` ${aiSummary.trim()}`));
    }

    console.log(chalk.gray(`\n${divider}\n`));

    await syncActivity('AUDIT', { address, score, grade }, `Audit grade ${grade} (${score}/100) for ${address}`);

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  Error: ${msg}\n`));
    process.exit(1);
  }
}