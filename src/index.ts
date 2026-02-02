import chalk from 'chalk';
import { setupCommand } from './commands/setup.js';
import { chatCommand } from './commands/chat.js';
import { Vault } from './core/security/vault.js';
import { researchCommand } from './commands/research.js';
import { newsCommand } from './commands/news.js';
import { loginCommand, logoutCommand } from './commands/login.js';
import { watchCommand } from './commands/watch.js';

const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.slice(1);

function showHelp() {
  console.log(chalk.blue.bold('\n Aura OS - Your AI Commander for Web3\n'));
  console.log(chalk.white('Usage:'));
  console.log(chalk.gray('  aura <command> [options]\n'));
  
  console.log(chalk.white('Commands:'));
  console.log(chalk.cyan('  setup') + chalk.gray('               Initialize Aura OS with your wallet'));
  console.log(chalk.cyan('  login [method]') + chalk.gray('      Login via browser (google/metamask)'));
  console.log(chalk.cyan('  chat <message>') + chalk.gray('      Send a natural language command to Aura'));
  console.log(chalk.cyan('  research <project>') + chalk.gray('  Deep project analysis with structured report'));
  console.log(chalk.cyan('  news [topic]') + chalk.gray('        Quick news headlines and summaries'));
  console.log(chalk.cyan('  watch [minutes]') + chalk.gray('     Start auto-monitoring alpha news (default: 15m)'));
  console.log(chalk.cyan('  status') + chalk.gray('              Check Aura OS configuration status'));
  console.log(chalk.cyan('  help') + chalk.gray('                Show this help message\n'));
  
  console.log(chalk.white('Examples:'));
  console.log(chalk.gray('  aura setup'));
  console.log(chalk.gray('  aura login'));
  console.log(chalk.gray('  aura chat "Check my ETH balance"'));
  console.log(chalk.gray('  aura chat "Send 0.1 ETH to 0x742d35Cc..."'));
  console.log(chalk.gray('  aura chat "What\'s my wallet address?"'));
  console.log(chalk.gray('  aura chat "Show my portfolio"'));
  console.log(chalk.gray('  aura chat "ETH price?"'));
  console.log(chalk.gray('  aura chat "Current gas price?"'));
  console.log(chalk.gray('  aura chat "Research Solana"'));
  console.log(chalk.gray('  aura news "Ethereum"'));
  console.log(chalk.gray('  aura news "Bitcoin ETF"\n'));
  
  console.log(chalk.white('Documentation:'));
  console.log(chalk.gray('  https://auraos.dev/docs\n'));
}

function showStatus() {
  console.log(chalk.blue.bold('\n Aura OS Status\n'));
  
  const isSetup = Vault.isSetup();
  
  if (isSetup) {
    console.log(chalk.green('  ✓ Wallet configured'));
    console.log(chalk.green('  ✓ Vault encrypted (AES-256)'));
  } else {
    console.log(chalk.yellow('  ⚠ Wallet not configured'));
    console.log(chalk.gray('    Run: aura setup'));
  }
  
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  if (hasApiKey) {
    console.log(chalk.green('  ✓ OpenAI API key configured'));
  } else {
    console.log(chalk.yellow('  ⚠ OpenAI API key not found'));
    console.log(chalk.gray('    Set OPENAI_API_KEY in your .env file'));
  }
  
  console.log('');
}

async function main() {
  // Load environment variables
  const dotenv = await import('dotenv');
  dotenv.config();

  switch (command) {
    case 'setup':
      await setupCommand();
      break;
      
    case 'chat':
      if (commandArgs.length === 0) {
        console.log(chalk.red('\n  Error: Message is required'));
        console.log(chalk.gray('  Usage: aura chat "Your message here"\n'));
        process.exit(1);
      }
      const message = commandArgs.join(' ');
      await chatCommand(message);
      break;

    case 'research':
      const researchTopic = commandArgs.join(' ');
      await researchCommand(researchTopic || undefined);
      break;

    case 'news':
    case '-n':
      const newsTopic = commandArgs.join(' ');
      await newsCommand(newsTopic || undefined);
      break;
      
    case 'status':
      showStatus();
      break;
      
    case 'help':
    case '--help':
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