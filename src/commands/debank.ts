import chalk from 'chalk';
import open from 'open';
import { isAddress } from 'viem';

export async function debankCommand(args: string[]) {
  const address = args[0];

  if (!address) {
    console.log(chalk.red('\n Error: Please provide an address.\n'));
    console.log(chalk.gray(' Usage: aura debank <address>\n'));
    return;
  }

  if (!isAddress(address)) {
      console.log(chalk.red('\n Error: Invalid EVM address.\n'));
      return;
  }

  const url = `https://debank.com/profile/${address}`;
  console.log(chalk.cyan(`\n Launching DeBank Portfolio for ${address.slice(0, 10)}...`));
  console.log(chalk.gray(` URL: ${url}\n`));
  
  await open(url);
}
