import chalk from 'chalk';
import inquirer from 'inquirer';
import { Vault } from '../core/security/vault.js';
import { BlockchainExecutor } from '../core/blockchain/executor.js';

export async function walletCommand(action: string = 'show') {
  if (!Vault.isSetup()) {
    console.log(chalk.yellow('\n Wallet not configured. Run "aura setup" first.\n'));
    return;
  }

  // Ubuntu-style silent input (no mask)
  const { masterPassword } = await inquirer.prompt([
    {
      type: 'password',
      name: 'masterPassword',
      message: chalk.cyan(' Enter master password to unlock your wallet:'),
      // no mask field → silent like Ubuntu
    }
  ]);

  const privateKey = Vault.getKey(masterPassword);

  if (!privateKey) {
    console.log(chalk.red('\n ❌ Invalid password. Access denied.\n'));
    return;
  }

  const executor = new BlockchainExecutor(privateKey);
  const address = executor.getAddress();
  const chain = executor.getChainName();

  console.log(chalk.green(`\n ✓ Wallet unlocked`));

  // ── show / portfolio ────────────────────────────────────────────────────────
  if (action === 'show' || action === 'portfolio') {
    console.log(chalk.gray(' Fetching balances...\n'));

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

      if (!balanceResult.success || !balanceResult.data?.balance) continue;

      const balance = parseFloat(balanceResult.data.balance);
      if (balance <= 0) continue;

      let usdValue = 0;
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

    const divider = '━'.repeat(39);
    console.log(chalk.cyan.bold(`\n${divider}`));
    console.log(chalk.cyan.bold('        AURA WALLET'));
    console.log(chalk.cyan.bold(divider));
    console.log(chalk.gray(` Address : ${address}`));
    console.log(chalk.gray(` Network : ${chain}\n`));

    if (portfolio.length === 0) {
      console.log(chalk.yellow(' No tokens found with balance > 0'));
    } else {
      portfolio.forEach(p => {
        const usd = `≈ $${p.usdValue.toFixed(2)}`;
        console.log(
          chalk.white(` ${p.token.padEnd(6)} `) +
          chalk.white(p.balance.padStart(15)) +
          chalk.gray(`  ${usd}`)
        );
      });
      console.log(chalk.cyan.bold(`\n${divider}`));
      console.log(chalk.green.bold(
        ` Total Value: $${totalUSD.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      ));
    }
    console.log('');
  }

  // ── export ──────────────────────────────────────────────────────────────────
  else if (action === 'export') {
    console.log(chalk.red.bold('\n  ⚠️  WARNING: You are exporting your PRIVATE KEY.'));
    console.log(chalk.red('     Never share this with anyone!\n'));

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.red('Are you absolutely sure you want to reveal your private key?'),
        default: false,
      }
    ]);

    if (!confirm) {
      console.log(chalk.gray('\n Cancelled.\n'));
      return;
    }

    // Extra: re-confirm by typing "CONFIRM"
    const { typed } = await inquirer.prompt([
      {
        type: 'input',
        name: 'typed',
        message: chalk.red(' Type CONFIRM to proceed:'),
      }
    ]);

    if (typed !== 'CONFIRM') {
      console.log(chalk.gray('\n Cancelled.\n'));
      return;
    }

    console.log(chalk.gray('\n Private Key:'));
    console.log(chalk.white(` ${privateKey}`));
    console.log(chalk.gray('\n ⚠️  Clear your terminal history after copying.\n'));
  }

  else {
    console.log(chalk.red(`\n Unknown action: "${action}"`));
    console.log(chalk.gray(' Usage: aura wallet [show|portfolio|export]\n'));
  }
}