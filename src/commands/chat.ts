import chalk from 'chalk';
import inquirer from 'inquirer';
import boxen from 'boxen';
import Table from 'cli-table3';
import ora from 'ora';
import { AIInterpreter, type Intent, type WalletContext } from '../core/ai/interpreter.js';
import { BlockchainExecutor } from '../core/blockchain/executor.js';
import { Vault } from '../core/security/vault.js';
import { BlockchainExplorer } from '../core/blockchain/explorer.js';
import { newsCommand } from './news.js';
import { researchCommand } from './research.js';
import { syncActivity } from '../core/utils/supabase.js';

export async function chatCommand(userInput: string) {
  const interpreter = new AIInterpreter();
  
  // Check if wallet is set up
  const isSetup = Vault.isSetup();
  let privateKey: string | null = null;
  let walletContext: WalletContext = { isConnected: false };

  console.log(chalk.gray('\n Aura is thinking...'));

  let intent: Intent | null = interpreter.quickParse(userInput);

  if (!intent) {
    intent = await interpreter.parse(userInput, walletContext);
  }

  if (!intent) {
    console.log(chalk.red('\n Failed to parse your request. Please try again.'));
    return;
  }

  if (intent.action === "REJECTED") {
    console.log(chalk.red(`\n Aura: ${intent.reason || "This request is not related to Web3."}`));
    return;
  }

  const sensitiveActions = ['SEND_TOKEN', 'SWAP_TOKEN', 'CHECK_BALANCE', 'GET_ADDRESS', 'PORTFOLIO'];
  
  if (sensitiveActions.includes(intent.action)) {
    if (!isSetup) {
      console.log(chalk.yellow('\n Wallet not configured. Run "aura setup" to use this feature.'));
      return;
    }

    const { masterPassword } = await inquirer.prompt([
      {
        type: 'password',
        name: 'masterPassword',
        message: chalk.cyan(' Enter master password to unlock your wallet:'),
        mask: '*'
      }
    ]);

    privateKey = Vault.getKey(masterPassword);
    
    if (privateKey) {
      const executor = new BlockchainExecutor(privateKey);
      walletContext = {
        isConnected: true,
        address: executor.getAddress() || undefined,
        chain: executor.getChainName(),
      };
      console.log(chalk.green(` Wallet unlocked: ${walletContext.address?.slice(0, 10)}...`));
    } else {
      console.log(chalk.red(' Invalid password. Access denied for this action.'));
      return;
    }
  }

  if (intent.action === 'GET_TRANSACTIONS') {
    const target = intent.target_address || walletContext.address;
    if (!target) {
      console.log(chalk.red('\n Please provide a wallet address to check.'));
      return;
    }
    
    console.log(chalk.gray(` Scanning ledger for: ${target}...`));
    const explorer = new BlockchainExplorer();
    const txs = await explorer.getTransactions(target);
    
    const summary = await interpreter.summarize(
      JSON.stringify(txs), 
      `Transaction history of the wallet ${target}`
    );
    
    console.log(chalk.cyan(`\n Aura's Ledger Report:`));
    console.log(chalk.white(summary));
    return;
  }

  if (intent.action === 'RESEARCH') {
    const topic = intent.topic || intent.token || undefined;
    await researchCommand(topic);
    return;
  }

  if (intent.action === 'NEWS') {
    const topic = intent.topic || intent.token || undefined;
    await newsCommand(topic);
    return;
  }

  if (intent.action === 'PORTFOLIO') {
    const loader = ora(chalk.cyan('Scanning decentralized assets...')).start();
    
    const executor = new BlockchainExecutor(privateKey!);
    const portfolio = await executor.getPortfolio();
    
    const totalUSD = portfolio.reduce((acc, item) => acc + item.usdValue, 0);
    loader.stop();

    const pTable = new Table({
      head: [chalk.magenta('CHAIN'), chalk.magenta('ASSET'), chalk.magenta('BALANCE'), chalk.magenta('VALUE (USD)')],
      colAligns: ['left', 'left', 'right', 'right'],
      style: { head: [], border: ['gray'] }
    });

    if (portfolio.length === 0) {
      pTable.push([{ colSpan: 4, content: chalk.gray('No assets found or network error.') }]);
    } else {
      // Sort by USD value descending
      portfolio.sort((a, b) => b.usdValue - a.usdValue);
      
      portfolio.forEach(p => pTable.push([
        chalk.blue(p.chain), 
        chalk.white(p.token), 
        chalk.white(p.balance), 
        chalk.green(`$${p.usdValue.toFixed(2)}`)
      ]));
    }

    const portfolioBox = boxen(
      `${chalk.bold.white('ADDRESS:')} ${chalk.gray(walletContext.address)}\n` +
      `${chalk.bold.white('SCAN:')} ${chalk.cyan('Multi-Chain Aggregation')}\n\n` +
      pTable.toString() + 
      `\n\n${chalk.green.bold('TOTAL NET WORTH: ')}${chalk.green.bold('$' + totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}`,
      { padding: 1, borderColor: 'magenta', title: ' AURA_PORTFOLIO', titleAlignment: 'center' }
    );
    console.log(portfolioBox);
    await syncActivity('PORTFOLIO', intent, `Total: $${totalUSD.toFixed(2)}`);
    return;
  }

  console.log(chalk.blue('\n Parsed Intent:'));
  console.log(chalk.white(`   Action: ${chalk.bold(intent.action)}`));
  if (intent.token) console.log(chalk.white(`   Token: ${intent.token}`));
  if (intent.amount) console.log(chalk.white(`   Amount: ${intent.amount}`));
  if (intent.target_address) console.log(chalk.white(`   To: ${intent.target_address}`));

  if (intent.action === 'SEND_TOKEN') {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.yellow(` Confirm sending ${intent.amount} ${intent.token} to ${intent.target_address}?`),
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.gray('\n Transaction cancelled by user.'));
      return;
    }
  }

  const executor = new BlockchainExecutor(privateKey || undefined);
  console.log(chalk.gray('\n Executing...'));
  
  const result = await executor.execute(intent);

  if (result.success) {
    console.log(chalk.green(`\n ${result.message}`));

    await syncActivity(intent.action, intent, result.message);
    if (result.data?.explorerUrl) {
      console.log(chalk.cyan(` View Transaction: ${result.data.explorerUrl}`));
    }
  } else {
    console.log(chalk.red(`\n Error: ${result.message}`));
    await syncActivity(intent.action, intent, `Error: ${result.message}`);
  }
}