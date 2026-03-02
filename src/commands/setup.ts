import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { Vault } from '../core/security/vault.js';
import { loginCommand } from './login.js';

export async function setupCommand() {
  console.log(chalk.blue.bold('\n Welcome to Aura OS - AI Agent Manager\n'));
  console.log(chalk.gray(' Configuring your personal AI Commander...\n'));

  // 1. Ask for Wallet Information
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'privateKey',
      message: chalk.cyan(' Enter your private key (EVM/Sui):'),
      validate: (value) => value.length > 32 ? true : 'Invalid private key format',
      mask: '*'
    },
    {
      type: 'password',
      name: 'masterPassword',
      message: chalk.cyan(' Set Master Password to encrypt your storage:'),
      validate: (value) => value.length >= 6 ? true : 'Master password must be at least 6 characters',
      mask: '*'
    }
  ]);

  // Save Wallet Keys to Vault
  Vault.saveKey(answers.privateKey, answers.masterPassword);
  console.log(chalk.green('\n ✓ Wallet encrypted and saved to Secure Vault.'));

  // 2. Ask for AI Keys
  console.log(chalk.gray('\n Now, configure your personal AI providers:'));
  
  const aiKeys = await inquirer.prompt([
    {
      type: 'input',
      name: 'OPENAI_API_KEY',
      message: chalk.magenta(' Enter OpenAI API Key (Required for most features):'),
      validate: (value) => (value.startsWith('sk-') || value === '') ? true : 'OpenAI key should start with sk- (or leave empty)'
    },
    {
      type: 'input',
      name: 'GROQ_API_KEY',
      message: chalk.magenta(' Enter Groq API Key (Optional fallback):'),
      default: ''
    },
    {
      type: 'input',
      name: 'GEMINI_API_KEY',
      message: chalk.magenta(' Enter Gemini API Key (Optional fallback):'),
      default: ''
    }
  ]);

  // 3. Save AI Keys to .env
  const envPath = path.resolve(process.cwd(), '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  Object.entries(aiKeys).forEach(([key, value]) => {
    if (!value) return;
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  });

  fs.writeFileSync(envPath, envContent.trim() + '\n');
  
  console.log(chalk.green(' ✓ AI API keys synchronized with local environment.'));

  // 4. Connect to Cloud (Sync with Dashboard)
  console.log(chalk.gray('\n Recommended: Connect to Cloud to sync your activities and manage plans.'));
  const { sync } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'sync',
      message: chalk.cyan(' Would you like to connect to Aura Dashboard now?'),
      default: true
    }
  ]);

  if (sync) {
    try {
      await loginCommand();
    } catch (err) {
      console.log(chalk.red('\n Connection failed. You can try again later with "aura login".'));
    }
  } else {
    console.log(chalk.yellow('\n (Skipped) You can always connect later with "aura login".'));
  }

  console.log(chalk.blue.bold('\n SETUP COMPLETE! Your Aura OS is now personalized and secured.\n'));
}