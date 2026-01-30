import chalk from 'chalk';
import inquirer from 'inquirer';
import { AIInterpreter, type Intent, type WalletContext } from '../core/ai/interpreter.js';
import { BlockchainExecutor } from '../core/blockchain/executor.js';
import { Vault } from '../core/security/vault.js';
import { BlockchainExplorer } from '../core/blockchain/explorer.js';
import { CryptoResearcher } from '../core/ai/researcher.js';
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
    const topic = intent.topic || intent.token || 'crypto market';
    console.log(chalk.gray(` Researching: "${topic}"...`));
    
    const researcher = new CryptoResearcher();
    const data = await researcher.research(topic);
    const rawText = data.map(d => d.content).join("\n");
    
    let summary = await interpreter.summarize(rawText, topic);
    
    // If includePrice is true, also fetch and append price
    if (intent.includePrice && intent.token) {
      const executor = new BlockchainExecutor();
      const priceResult = await executor.execute({ 
        ...intent, 
        action: 'GET_PRICE' 
      });
      if (priceResult.success) {
        summary += `\n\n${priceResult.message}`;
      }
    }
    
    console.log(chalk.cyan.bold('\n--- AURA RESEARCH ---'));
    console.log(chalk.white(summary));
    
    if (data.length > 0) {
      console.log(chalk.gray('\n Sources:'));
      data.slice(0, 3).forEach(d => {
        console.log(chalk.gray(` • ${d.title} - ${d.url}`));
      });
    }
    
    await syncActivity('RESEARCH', intent, summary);
    return;
  }

  if (intent.action === 'PORTFOLIO') {
    console.log(chalk.gray(' Fetching portfolio...'));
    
    const executor = new BlockchainExecutor(privateKey || undefined);
    const tokens = ['ETH', 'USDT', 'USDC'];
    const portfolio: { token: string; balance: string; usdValue: number }[] = [];
    let totalUSD = 0;

    for (const token of tokens) {
      const balanceResult = await executor.execute({
        action: 'CHECK_BALANCE',
        token,
        amount: null,
        target_address: null,
        chain: null,
        reason: null,
        topic: null,
        includePrice: null,
      });

      if (balanceResult.success && balanceResult.data?.balance) {
        const balance = parseFloat(balanceResult.data.balance);
        if (balance > 0) {
          // Get price
          const priceResult = await executor.execute({
            action: 'GET_PRICE',
            token,
            amount: null,
            target_address: null,
            chain: null,
            reason: null,
            topic: null,
            includePrice: null,
          });

          let usdValue = 0;
          if (priceResult.success) {
            const priceMatch = priceResult.message.match(/\$([\d,\.]+)/);
            if (priceMatch) {
              const price = parseFloat(priceMatch[1].replace(/,/g, ''));
              usdValue = balance * price;
              totalUSD += usdValue;
            }
          }

          portfolio.push({ token, balance: balanceResult.data.balance, usdValue });
        }
      }
    }

    console.log(chalk.cyan.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.cyan.bold('       💼 AURA PORTFOLIO'));
    console.log(chalk.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.gray(` Address: ${walletContext.address}`));
    console.log(chalk.gray(` Network: ${walletContext.chain}\n`));

    if (portfolio.length === 0) {
      console.log(chalk.yellow(' No tokens found with balance > 0'));
    } else {
      portfolio.forEach(p => {
        console.log(chalk.white(` ${p.token.padEnd(6)} ${p.balance.padStart(15)} ≈ $${p.usdValue.toFixed(2)}`));
      });
      console.log(chalk.cyan.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.green.bold(` 💰 Total Value: $${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`));
    }

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