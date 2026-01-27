import inquirer from 'inquirer';
import chalk from 'chalk';
import { Vault } from '../core/security/vault.js';

export async function setupCommand() {
  console.log(chalk.blue.bold('\n Welcome to Aura OS - AI Agent Manager\n'));

  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'privateKey',
      message: 'Enter your private key (will be encrypted locally):',
      validate: (value) => value.length > 0 ? true : 'Private key is required',
      mask: '*'
    },
    {
      type: 'password',
      name: 'masterPassword',
      message: 'Set Master Password to protect your wallet:',
      validate: (value) => value.length >= 6 ? true : 'Master password must be at least 6 characters',
      mask: '*'
    }
  ]);

  Vault.saveKey(answers.privateKey, answers.masterPassword);
  
  console.log(chalk.green('\n Setup complete! Your private key is protected by AES-256.\n'));
}