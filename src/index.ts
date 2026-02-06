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

const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.slice(1);

const auraGradient = gradient(['#06b6d4', '#8b5cf6', '#ec4899']); // Cyan -> Purple -> Pink

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
    ${chalk.magenta('setup')}       ${chalk.gray('Initialize your encrypted Web3 vault')}
    ${chalk.magenta('research')}    ${chalk.gray('Deep project analysis & Sentiment')}
    ${chalk.magenta('watch')}       ${chalk.gray('Automated AI alpha hunting mode')}

  ${chalk.bold.white('INTERACTION')}
    ${chalk.cyan('chat')}        ${chalk.gray('Natural language AI interaction')}
    ${chalk.cyan('news')}        ${chalk.gray('Real-time crypto alpha aggregator')}

  ${chalk.bold.white('SYSTEM')}
    ${chalk.gray('wallet')}      ${chalk.gray('Manage accounts (show, export)')}
    ${chalk.gray('dashboard')}   ${chalk.gray('Launch the real-time Web UI')}
    ${chalk.gray('login')}       ${chalk.gray('Login via browser (google/metamask)')}
    ${chalk.gray('status')}      ${chalk.gray('Check Aura OS configuration status')}
    ${chalk.gray('help')}        ${chalk.gray('Show this help message')}
  `;

  console.log(boxen(helpContent, {
    padding: 1,
    borderColor: 'cyan',
    borderStyle: 'round',
    title: chalk.bold.cyan(' ⬢ Aura Menu '),
    titleAlignment: 'center'
  }));
}

function showStatus() {
  showBanner();
  
  const isSetup = Vault.isSetup();
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  const statusInfo = `
  ${chalk.bold('VAULT:')}    ${isSetup ? chalk.green('ACTIVE') : chalk.red('INACTIVE')}
  ${chalk.bold('NETWORK:')}  ${chalk.cyan('SUI_MAINNET')}
  ${chalk.bold('AI_CORE:')}  ${hasApiKey ? chalk.green('ONLINE') : chalk.red('OFFLINE')}

  ${chalk.gray('──────────────────────────────────────')}

  ${isSetup ? chalk.gray('Security: AES-256 Encryption active.') : chalk.yellow('Action: Run "aura setup" to begin.')}
  `;

  console.log(boxen(statusInfo, {
    padding: 1,
    borderColor: isSetup && hasApiKey ? 'green' : 'yellow',
    borderStyle: 'double',
    title: chalk.bold(' SYSTEM_DIAGNOSTICS '),
    titleAlignment: 'left'
  }));
}

async function main() {
  // Load environment variables
  const dotenv = await import('dotenv');
  dotenv.config();

  switch (command) {
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
      const message = commandArgs.join(' ');
      await chatCommand(message);
      break;

    case 'research':
    case '-r':
      const researchTopic = commandArgs.join(' ');
      await researchCommand(researchTopic || undefined);
      break;

    case 'news':
    case '-n':
      const newsTopic = commandArgs.join(' ');
      await newsCommand(newsTopic || undefined);
      break;
      
    case 'status':
    case '-s':
      showStatus();
      break;
      
    case 'help':
    case '--help':
    case '--h':
    case '-h':
      showHelp();
      break;

    case 'login':
    case '-l':
      const loginMethod = commandArgs[0];
      await loginCommand(loginMethod);
      break;

    case 'watch':
    case '-w':
      const intervalMinutes = parseInt(commandArgs[0]) || 15;
      await watchCommand(intervalMinutes);
      break;

    case 'dashboard':
    case '-d':
      await dashboardCommand();
      break;

    case 'wallet':
    case '-w':
      const walletAction = commandArgs[0];
      await walletCommand(walletAction);
      break;

    case 'run':
      const scriptName = commandArgs[0];
      const scriptArgs = commandArgs.slice(1);
      await runCommand(scriptName, scriptArgs);
      break;

    case 'logout':
      await logoutCommand();
      break;
      
    case undefined:
      showHelp();
      break;
      
    default:
      console.log(chalk.red(`\n  Unknown command: ${command}`));
      console.log(chalk.gray('  Run "aura help" for available commands\n'));
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.red('\n  Error:'), error.message);
  process.exit(1);
});