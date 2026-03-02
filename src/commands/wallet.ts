import chalk from 'chalk';
import inquirer from 'inquirer';
import { Vault } from '../core/security/vault.js';
import { BlockchainExecutor } from '../core/blockchain/executor.js';

export async function walletCommand(action: string = 'show') {
  const isSetup = Vault.isSetup();
  
  if (!isSetup) {
    console.log(chalk.yellow('\n Wallet not configured. Run "aura setup" first.'));
    return;
  }

  const { masterPassword } = await inquirer.prompt([
    {
      type: 'password',
      name: 'masterPassword',
      message: chalk.cyan(' Enter master password to unlock your wallet:'),
      mask: ''
    }
  ]);

  const privateKey = Vault.getKey(masterPassword);
  
  if (!privateKey) {
    console.log(chalk.red(' Invalid password. Access denied.'));
    return;
  }

  const executor = new BlockchainExecutor(privateKey);
  const address = executor.getAddress();
  const chain = executor.getChainName();

  console.log(chalk.green(`\n Wallet unlocked: ${address?.slice(0, 10)}...`));

  if (action === 'show' || action === 'portfolio') {
    console.log(chalk.gray(' Fetching balances...'));
    
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
    console.log(chalk.cyan.bold('       AURA WALLET'));
    console.log(chalk.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.gray(` Address: ${address}`));
    console.log(chalk.gray(` Network: ${chain}\n`));

    if (portfolio.length === 0) {
      console.log(chalk.yellow(' No tokens found with balance > 0'));
    } else {
      portfolio.forEach(p => {
        console.log(chalk.white(` ${p.token.padEnd(6)} ${p.balance.padStart(15)} ≈ $${p.usdValue.toFixed(2)}`));
      });
      console.log(chalk.cyan.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.green.bold(` Total Value: $${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`));
    }
  } else if (action === 'export') {
    console.log(chalk.red.bold('\n  WARNING: You are exporting your PRIVATE KEY.'));
    console.log(chalk.red('    Never share this with anyone!'));
    
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you absolutely sure you want to show your private key?',
        default: false
      }
    ]);

    if (confirm) {
      console.log(chalk.gray('\n Private Key:'));
      console.log(chalk.white(privateKey));
      console.log('');
    }
  }
}
