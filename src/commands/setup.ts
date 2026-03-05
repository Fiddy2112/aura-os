import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Vault } from '../core/security/vault.js';
import { loginCommand } from './login.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Validate EVM private key — accepts both with and without 0x prefix.
 */
function isValidPrivateKey(value: string): true | string {
  const hex = value.startsWith('0x') ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    return 'Invalid private key (must be 64 hex characters)';
  }
  return true;
}

/**
 * Resolve a safe config directory for storing .env / keys —
 * always uses the user home config folder, never process.cwd().
 */
function getConfigDir(): string {
  const dir = path.join(os.homedir(), '.config', 'aura-os');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

export async function setupCommand() {
  console.log(chalk.blue.bold('\n Welcome to Aura OS — AI Agent Manager\n'));
  console.log(chalk.gray(' Configuring your personal AI Commander...\n'));
  console.log(chalk.gray(' (Password inputs are silent — nothing will appear as you type)\n'));

  // ── Wallet setup ────────────────────────────────────────────────────────
  const { privateKey, masterPassword, confirmPassword } = await inquirer.prompt([
    {
      type: 'password',
      name: 'privateKey',
      message: chalk.cyan(' Enter your EVM private key:'),
      // mask: undefined → Ubuntu-style silent input (nothing shown)
      validate: isValidPrivateKey,
    },
    {
      type: 'password',
      name: 'masterPassword',
      message: chalk.cyan(' Set Master Password to encrypt your vault:'),
      validate: (value: string) =>
        value.length >= 8
          ? true
          : 'Master password must be at least 8 characters',
    },
    {
      type: 'password',
      name: 'confirmPassword',
      message: chalk.cyan(' Confirm Master Password:'),
      validate: (value: string, answers: any) =>
        value === answers.masterPassword
          ? true
          : 'Passwords do not match',
    },
  ]);

  Vault.saveKey(privateKey, masterPassword);
  console.log(chalk.green('\n ✓ Wallet encrypted and saved to Secure Vault.'));

  // ── AI keys ─────────────────────────────────────────────────────────────
  console.log(chalk.gray('\n Configure your AI providers (press Enter to skip optional keys):\n'));

  const aiKeys = await inquirer.prompt([
    {
      type: 'password',
      name: 'OPENAI_API_KEY',
      message: chalk.magenta(' OpenAI API Key') + chalk.gray(' (required):'),
      validate: (value: string) => {
        if (!value) return 'OpenAI key is required';
        if (!value.startsWith('sk-')) return 'OpenAI key should start with sk-';
        return true;
      },
    },
    {
      type: 'password',
      name: 'GROQ_API_KEY',
      message: chalk.magenta(' Groq API Key') + chalk.gray(' (optional fallback):'),
    },
    {
      type: 'password',
      name: 'GEMINI_API_KEY',
      message: chalk.magenta(' Gemini API Key') + chalk.gray(' (optional fallback):'),
    },
    {
      type: 'password',
      name: 'TAVILY_API_KEY',
      message: chalk.magenta(' Tavily API Key') + chalk.gray(' (optional, for research):'),
    },
  ]);

  // ── Write keys to ~/.config/aura-os/.env ────────────────────────────────
  const envPath = path.join(getConfigDir(), '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

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
  console.log(chalk.green(` ✓ AI keys saved to ${envPath}`));

  // ── Optional dashboard sync ─────────────────────────────────────────────
  console.log(chalk.gray('\n Connect to the cloud dashboard to sync your activity.\n'));

  const { sync } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'sync',
      message: chalk.cyan(' Connect to Aura Dashboard now?'),
      default: true,
    },
  ]);

  if (sync) {
    try {
      await loginCommand();
    } catch {
      console.log(chalk.red('\n Connection failed. Try again later with "aura login".\n'));
    }
  } else {
    console.log(chalk.yellow('\n Skipped. Run "aura login" whenever you\'re ready.\n'));
  }

  console.log(chalk.blue.bold('\n ✓ SETUP COMPLETE! Aura OS is ready.\n'));
}