import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Vault } from '../core/security/vault.js';
import { loginCommand } from './login.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidPrivateKey(value: string): true | string {
  const hex = value.startsWith('0x') ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    return 'Invalid private key (must be 64 hex characters)';
  }
  return true;
}

function getConfigDir(): string {
  const dir = path.join(os.homedir(), '.config', 'aura-os');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function upsertEnvKey(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*`, 'm');
  return regex.test(content)
    ? content.replace(regex, `${key}=${value}`)
    : content + `\n${key}=${value}`;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

export async function setupCommand() {
  console.log(chalk.blue.bold('\n Welcome to Aura OS — AI Agent Manager\n'));
  console.log(chalk.gray(' Configuring your personal AI Commander...\n'));
  console.log(chalk.gray(' (Password inputs are silent — nothing will appear as you type)\n'));

  // ── Wallet setup ──────────────────────────────────────────────────────────
  const { privateKey, masterPassword, confirmPassword } = await inquirer.prompt([
    {
      type:     'password',
      name:     'privateKey',
      message:  chalk.cyan(' Enter your EVM private key:'),
      validate: isValidPrivateKey,
    },
    {
      type:    'password',
      name:    'masterPassword',
      message: chalk.cyan(' Set Master Password to encrypt your vault:'),
      validate: (value: string) =>
        value.length >= 8 ? true : 'Master password must be at least 8 characters',
    },
    {
      type:    'password',
      name:    'confirmPassword',
      message: chalk.cyan(' Confirm Master Password:'),
      validate: (value: string, answers: any) =>
        value === answers.masterPassword ? true : 'Passwords do not match',
    },
  ]);

  Vault.saveKey(privateKey, masterPassword);
  console.log(chalk.green('\n ✓ Wallet encrypted and saved to Secure Vault.'));

  // ── AI keys ───────────────────────────────────────────────────────────────
  console.log(chalk.gray('\n Configure AI providers. At least one key is required.\n'));
  console.log(chalk.gray(' Priority order: OpenAI → Groq → Gemini\n'));

  let aiKeys: Record<string, string>;
  while (true) {
    aiKeys = await inquirer.prompt([
      {
        type:    'password',
        name:    'OPENAI_API_KEY',
        message: chalk.magenta(' OpenAI API Key') + chalk.gray(' (optional, recommended):'),
      },
      {
        type:    'password',
        name:    'GROQ_API_KEY',
        message: chalk.magenta(' Groq API Key') + chalk.gray(' (optional fallback, free):'),
      },
      {
        type:    'password',
        name:    'GEMINI_API_KEY',
        message: chalk.magenta(' Gemini API Key') + chalk.gray(' (optional fallback):'),
      },
      {
        type:    'password',
        name:    'TAVILY_API_KEY',
        message: chalk.magenta(' Tavily API Key') + chalk.gray(' (optional, for research/news):'),
      },
    ]) as Record<string, string>;

    const hasAiKey = aiKeys.OPENAI_API_KEY || aiKeys.GROQ_API_KEY || aiKeys.GEMINI_API_KEY;
    if (hasAiKey) break;

    console.log(chalk.red('\n At least one AI key is required (OpenAI, Groq, or Gemini).\n'));
  }

  // ── Optional API keys ─────────────────────────────────────────────────────
  console.log(chalk.gray('\n Optional integrations (press Enter to skip):\n'));

  const optionalKeys = await inquirer.prompt([
    {
      type:    'password',
      name:    'ALCHEMY_API_KEY',
      message: chalk.magenta(' Alchemy API Key') + chalk.gray(' (NFT portfolio data):'),
    },
    {
      type:    'password',
      name:    'ETHERSCAN_API_KEY',
      message: chalk.magenta(' Etherscan API Key') + chalk.gray(' (verified ABI lookup):'),
    },
    {
      type:    'password',
      name:    'TENDERLY_API_KEY',
      message: chalk.magenta(' Tenderly API Key') + chalk.gray(' (tx simulation / state diff):'),
    },
  ]) as Record<string, string>;

  // Tenderly requires user + project if key is provided
  let tenderlyUser    = '';
  let tenderlyProject = '';
  if (optionalKeys.TENDERLY_API_KEY?.trim()) {
    const tenderlyMeta = await inquirer.prompt([
      {
        type:    'input',
        name:    'user',
        message: chalk.magenta(' Tenderly username:'),
      },
      {
        type:    'input',
        name:    'project',
        message: chalk.magenta(' Tenderly project slug:'),
      },
    ]);
    tenderlyUser    = tenderlyMeta.user;
    tenderlyProject = tenderlyMeta.project;
  }

  // ── Write .env ────────────────────────────────────────────────────────────
  const envPath = path.join(getConfigDir(), '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

  // AI keys
  for (const [key, value] of Object.entries(aiKeys)) {
    if (value?.trim()) envContent = upsertEnvKey(envContent, key, value.trim());
  }

  // Optional keys
  for (const [key, value] of Object.entries(optionalKeys)) {
    if (value?.trim()) envContent = upsertEnvKey(envContent, key, value.trim());
  }

  // Tenderly meta
  if (tenderlyUser)    envContent = upsertEnvKey(envContent, 'TENDERLY_USER',    tenderlyUser);
  if (tenderlyProject) envContent = upsertEnvKey(envContent, 'TENDERLY_PROJECT', tenderlyProject);

  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log(chalk.green(`\n ✓ Configuration saved to ${envPath}`));

  // ── Summary ───────────────────────────────────────────────────────────────
  const activeAI = [
    aiKeys.OPENAI_API_KEY  ? 'OpenAI'   : null,
    aiKeys.GROQ_API_KEY    ? 'Groq'     : null,
    aiKeys.GEMINI_API_KEY  ? 'Gemini'   : null,
  ].filter(Boolean).join(', ');

  const activeOptional = [
    optionalKeys.ALCHEMY_API_KEY   ? 'Alchemy'   : null,
    optionalKeys.ETHERSCAN_API_KEY ? 'Etherscan' : null,
    optionalKeys.TENDERLY_API_KEY  ? 'Tenderly'  : null,
  ].filter(Boolean);

  console.log(chalk.gray(`\n AI providers: ${chalk.white(activeAI)}`));
  if (activeOptional.length > 0) {
    console.log(chalk.gray(` Integrations: ${chalk.white(activeOptional.join(', '))}`));
  }

  // ── Optional dashboard sync ───────────────────────────────────────────────
  console.log(chalk.gray('\n Connect to the cloud dashboard to sync your activity.\n'));

  const { sync } = await inquirer.prompt([{
    type:    'confirm',
    name:    'sync',
    message: chalk.cyan(' Connect to Aura Dashboard now?'),
    default: true,
  }]);

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