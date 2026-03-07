#!/usr/bin/env node
import './env.js';
import pkg from '../package.json' with { type: 'json' };
import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';
import { setupCommand } from './commands/setup.js';
import { chatCommand } from './commands/chat.js';
import { Vault } from './core/security/vault.js';
import { researchCommand } from './commands/research.js';
import { newsCommand } from './commands/news.js';
import { loginCommand, logoutCommand } from './commands/login.js';
import { watchCommand } from './commands/watch.js';
import { dashboardCommand } from './commands/dashboard.js';
import { walletCommand } from './commands/wallet.js';
import { runCommand } from './commands/run.js';
import { debankCommand } from './commands/debank.js';
import analyzeCommand from './commands/analyze.js';
import { resetPasswordCommand } from './commands/reset-password.js';
import { devCommands } from './commands/registry.js';
import { scriptCommand } from './commands/script.js';
import txCommand from './commands/tx.js';
import { gasCommand } from './commands/gas.js';
import whaleCommand from './commands/whale.js';
import auditCommand from './commands/audit.js';
import trackCommand from './commands/track.js';
import askCommand from './commands/ask.js';


const args        = process.argv.slice(2);
const command     = args[0];
const commandArgs = args.slice(1);

const auraGradient = gradient(['#06b6d4', '#8b5cf6', '#ec4899']);

export function showBanner() {
  const banner = `
   █████╗ ██╗   ██╗██████╗  █████╗      ██████╗ ███████╗
  ██╔══██╗██║   ██║██╔══██╗██╔══██╗    ██╔═══██╗██╔════╝
  ███████║██║   ██║██████╔╝███████║    ██║   ██║███████╗
  ██╔══██║██║   ██║██╔══██╗██╔══██║    ██║   ██║╚════██║
  ██║  ██║╚██████╔╝██║  ██║██║  ██║    ╚██████╔╝███████║
  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝     ╚═════╝ ╚══════╝
  `;
  console.log(auraGradient(banner));
  console.log(chalk.cyan(' ▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚'));
}

function showHelp() {
  showBanner();

  const helpContent = `
  ${chalk.bold.white('MAIN COMMANDS')}
    ${chalk.magenta('setup')}          ${chalk.gray('Initialize your encrypted Web3 vault')}
    ${chalk.magenta('research')}       ${chalk.gray('Deep project analysis & sentiment')}
    ${chalk.magenta('analyze')}        ${chalk.gray('Security analysis & verdict (Trader/Dev modes)')}
    ${chalk.magenta('watch')}          ${chalk.gray('Automated AI alpha hunting mode')}

  ${chalk.bold.white('INTERACTION')}
    ${chalk.cyan('chat')}           ${chalk.gray('Natural language AI interaction')}
    ${chalk.cyan('news')}           ${chalk.gray('Real-time crypto alpha aggregator')}
    ${chalk.cyan('ask')}            ${chalk.gray('Ask any Web3/Solidity question (no wallet needed)')}

  ${chalk.bold.white('ANALYTICS')}
    ${chalk.cyan('whale')}          ${chalk.gray('Whale wallet activity & accumulation signals')}
    ${chalk.cyan('track')}          ${chalk.gray('Track portfolio balance for any wallet')}
    ${chalk.cyan('audit')}          ${chalk.gray('Full security audit with vulnerability scan')}

  ${chalk.bold.white('SYSTEM')}
    ${chalk.gray('wallet')}         ${chalk.gray('Manage accounts (show, export)')}
    ${chalk.gray('debank')}         ${chalk.gray('Open DeBank portfolio for an address')}
    ${chalk.gray('dashboard')}      ${chalk.gray('Launch the real-time Web UI')}
    ${chalk.gray('login')}          ${chalk.gray('Login via browser (Google / MetaMask)')}
    ${chalk.gray('logout')}         ${chalk.gray('Disconnect from dashboard')}
    ${chalk.gray('status')}         ${chalk.gray('Check Aura OS configuration status')}
    ${chalk.gray('reset-password')} ${chalk.gray('Change or reset your master password')}
    ${chalk.gray('script')}         ${chalk.gray('Manage custom scripts (list, create)')}
    ${chalk.gray('run')}            ${chalk.gray('Run a custom script by name')}
    ${chalk.gray('tx')}             ${chalk.gray('Analyze a transaction by hash')}
    ${chalk.gray('gas')}            ${chalk.gray('Real-time gas prices across all networks')}
    ${chalk.gray('help')}           ${chalk.gray('Show this help message')}

  ${chalk.bold.white('DEV / SECURITY')}
    ${chalk.gray('info')}           ${chalk.gray('Contract identity & intelligence')}
    ${chalk.gray('privilege')}      ${chalk.gray('Ownership & control surface analysis')}
    ${chalk.gray('risk')}           ${chalk.gray('Centralization & upgrade risk score')}
    ${chalk.gray('chain')}          ${chalk.gray('Manage blockchain chain (current/list/set)')}

  ${chalk.bold.white('FLAGS')}
    ${chalk.gray('--dev')}          ${chalk.gray('Enable developer / forensic mode')}
    ${chalk.gray('--json')}         ${chalk.gray('Output raw JSON')}
    ${chalk.gray('-h, --help')}     ${chalk.gray('Show help')}
    ${chalk.gray('-v')}             ${chalk.gray('Show version')}
  `;

  console.log(boxen(helpContent, {
    padding: 1,
    borderColor: 'cyan',
    borderStyle: 'round',
    title: chalk.bold.cyan(' ⬢ Aura Menu '),
    titleAlignment: 'center',
  }));
}

function showStatus() {
  showBanner();

  const isSetup   = Vault.isSetup();
  const hasApiKey = !!(process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);

  const statusInfo = `
  ${chalk.bold('VAULT:')}    ${isSetup   ? chalk.green('ACTIVE')  : chalk.red('INACTIVE')}
  ${chalk.bold('AI_CORE:')} ${hasApiKey  ? chalk.green('ONLINE')  : chalk.red('OFFLINE')}

  ${chalk.gray('──────────────────────────────────────')}

  ${isSetup ? chalk.gray('Security: AES-256 Encryption active.') : chalk.yellow('Action: Run "aura setup" to begin.')}
  `;

  console.log(boxen(statusInfo, {
    padding: 1,
    borderColor: isSetup && hasApiKey ? 'green' : 'yellow',
    borderStyle: 'double',
    title: chalk.bold(' SYSTEM_DIAGNOSTICS '),
    titleAlignment: 'left',
  }));
}

function resolveDevCommand(name: string) {
  for (const [key, cmd] of Object.entries(devCommands)) {
    if (key === name) return cmd;
    if (cmd.aliases?.includes(name)) return cmd;
  }
  return null;
}

async function main() {

  // ── dev sub-commands ───────────────────────────────────────────────────────
  if (command === 'dev') {
    const sub = commandArgs[0];

    if (!sub || sub === '--help' || sub === '-h') {
      console.log(chalk.bold.cyan('\n=== Dev Commands ===\n'));
      Object.entries(devCommands).forEach(([name, cmd]) => {
        const alias = cmd.aliases?.length ? ` (${cmd.aliases.join(', ')})` : '';
        console.log(` - ${chalk.yellow(name)}${alias} : ${chalk.gray(cmd.description)}`);
      });
      console.log('');
      return;
    }

    const cmd = resolveDevCommand(sub);
    if (!cmd) {
      console.log(chalk.red(`\n Unknown dev command: "${sub}"\n`));
      process.exit(1);
    }

    await cmd.handler(commandArgs.slice(1));
    return;
  }

  // ── top-level commands ─────────────────────────────────────────────────────
  switch (command) {

    case 'version':
    case '--version':
    case '-v':
      console.log(chalk.cyan(`Aura OS v${pkg.version}`));
      break;

    case 'setup':
    case '-sp':
      await setupCommand();
      break;

    case 'chat':
    case '-c':
      if (commandArgs.length === 0) {
        console.log(chalk.red('\n  Error: Message is required'));
        console.log(chalk.gray('  Usage: aura chat "Your message here"\n'));
        process.exit(1);
      }
      await chatCommand(commandArgs.join(' '));
      break;

    case 'research':
    case '-r':
      await researchCommand(commandArgs);
      break;

    case 'news':
    case '-n':
      await newsCommand(commandArgs.join(' ') || undefined);
      break;

    case 'status':
    case '-s':
      showStatus();
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    case 'login':
    case '-l':
      await loginCommand(commandArgs[0]);
      break;

    case 'watch':
    case '-w':
      await watchCommand(parseInt(commandArgs[0]) || 15);
      break;

    case 'dashboard':
    case '-d':
      await dashboardCommand();
      break;

    case 'wallet':
    case '-wl':
      await walletCommand(commandArgs[0]);
      break;

    case 'run':
      await runCommand(commandArgs);
      break;

    case 'analyze':
    case '-a':
      await analyzeCommand(commandArgs);
      break;

    case 'debank':
    case '-db':
      await debankCommand(commandArgs);
      break;

    case 'logout':
      await logoutCommand();
      break;

    case 'reset-password':
    case '-rp':
      await resetPasswordCommand();
      break;

    case 'script':
      await scriptCommand(commandArgs);
      break;

    case 'tx':
      await txCommand(commandArgs);
      break;

    case 'gas':
    case '-g':
      await gasCommand();
      break;

    case 'whale':
      await whaleCommand(commandArgs);
      break;

    case 'audit':
      await auditCommand(commandArgs);
      break;

    case 'track':
      await trackCommand(commandArgs);
      break;

    case 'ask':
      if (commandArgs.length === 0) {
        console.log(chalk.red('\n  Error: Question is required'));
        console.log(chalk.gray('  Usage: aura ask "How does ERC-4337 work?"\n'));
        process.exit(1);
      }
      await askCommand(commandArgs);
      break;

    case undefined:
      showHelp();
      break;

    default:
      console.log(chalk.red(`\n  Unknown command: "${command}"`));
      console.log(chalk.gray('  Run "aura help" for available commands\n'));
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.red('\n  Error:'), error instanceof Error ? error.message : String(error));
  process.exit(1);
});