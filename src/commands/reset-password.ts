import inquirer from 'inquirer';
import chalk from 'chalk';
import { Vault } from '../core/security/vault.js';

export async function resetPasswordCommand() {
  console.log(chalk.bold.cyan('\n 🔐 Aura OS - Password Management\n'));

  const isSetup = Vault.isSetup();

  if (!isSetup) {
    console.log(chalk.yellow(' No wallet configured. Please run "aura setup" to create your first vault.'));
    return;
  }

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Choose an action:',
      choices: [
        { name: 'I know my current password and want to change it', value: 'change' },
        { name: 'I forgot my password (requires my Private Key to reset)', value: 'forgot' },
        { name: 'Cancel', value: 'cancel' }
      ]
    }
  ]);

  if (choice === 'cancel') return;

  if (choice === 'change') {
    const { oldPassword } = await inquirer.prompt([
      {
        type: 'password',
        name: 'oldPassword',
        message: 'Enter your CURRENT master password:',
        mask: ''
      }
    ]);

    const privateKey = Vault.getKey(oldPassword);

    if (!privateKey) {
      console.log(chalk.red('\n ✗ Invalid current password. Cannot authorize change.'));
      return;
    }

    const { newPassword, confirmPassword } = await inquirer.prompt([
      {
        type: 'password',
        name: 'newPassword',
        message: 'Enter your NEW master password (min 6 chars):',
        validate: (v) => v.length >= 6 ? true : 'Too short!',
        mask: ''
      },
      {
        type: 'password',
        name: 'confirmPassword',
        message: 'Confirm NEW master password:',
        validate: (v, answers) => v === (answers as any).newPassword ? true : 'Passwords do not match!',
        mask: ''
      }
    ]);

    Vault.saveKey(privateKey, newPassword);
    console.log(chalk.green('\n ✓ Password updated successfully! Your vault has been re-encrypted.'));
  }

  if (choice === 'forgot') {
    console.log(chalk.yellow('\n ⚠️  If you forgot your password, you must provide your raw private key to re-encrypt your vault.'));
    
    const { privateKey, newPassword } = await inquirer.prompt([
      {
        type: 'password',
        name: 'privateKey',
        message: 'Enter your raw Private Key:',
        validate: (v) => v.length > 32 ? true : 'Invalid key format',
        mask: ''
      },
      {
        type: 'password',
        name: 'newPassword',
        message: 'Set your NEW master password:',
        validate: (v) => v.length >= 6 ? true : 'Too short!',
        mask: ''
      }
    ]);

    Vault.saveKey(privateKey, newPassword);
    console.log(chalk.green('\n ✓ Vault reset successful! Your new master password is now active.'));
  }
}
