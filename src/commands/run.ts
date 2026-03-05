import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { pathToFileURL } from 'url';
import { BlockchainExecutor } from '../core/blockchain/executor.js';
import { AIInterpreter } from '../core/ai/interpreter.js';
import { Vault } from '../core/security/vault.js';
import { type ScriptContext, type AuraScript } from '../core/scripting/types.js';
import { syncActivity } from '../core/utils/supabase.js';

export async function runCommand(args: string[]) {
  const scriptName = args[0];
  const scriptArgs = args.slice(1);

  if (!scriptName) {
    console.log(chalk.red('\n Error: Please provide a script name.'));
    console.log(chalk.gray(' Usage: aura run <script-name> [args]'));
    console.log(chalk.gray(' Example: aura run sweep-tokens\n'));
    return;
  }

  // ── Resolve script path ────────────────────────────────────────────────────
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, scriptName),
    path.resolve(cwd, 'scripts', scriptName),
    path.resolve(cwd, 'scripts', `${scriptName}.ts`),
    path.resolve(cwd, 'scripts', `${scriptName}.js`),
    path.resolve(cwd, `${scriptName}.ts`),
    path.resolve(cwd, `${scriptName}.js`),
  ];

  const scriptPath = candidates.find(p => fs.existsSync(p));

  if (!scriptPath) {
    console.log(chalk.red(`\n ✗ Script not found: "${scriptName}"`));
    console.log(chalk.gray(` Searched in: ./scripts/\n`));
    return;
  }

  // ── Security warning ───────────────────────────────────────────────────────
  console.log(chalk.yellow.bold(`\n ⚠️  SECURITY WARNING`));
  console.log(chalk.white(` You are about to execute an external script:`));
  console.log(chalk.gray(` File: ${scriptPath}`));
  console.log(chalk.white(` Only run scripts from sources you trust completely.\n`));

  // ── Load & validate script ─────────────────────────────────────────────────
  let scriptFn: AuraScript;
  try {
    const scriptUrl = pathToFileURL(scriptPath).toString();
    const module = await import(scriptUrl);
    scriptFn = module.default;

    if (typeof scriptFn !== 'function') {
      console.log(chalk.red(`\n ✗ Script must export a default function.`));
      console.log(chalk.gray(`   export default async function(context) { ... }\n`));
      return;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n ✗ Failed to load script: ${msg}\n`));
    return;
  }

  // ── unlockWallet helper exposed to scripts ─────────────────────────────────
  const unlockWallet = async (): Promise<BlockchainExecutor | null> => {
    if (!Vault.isSetup()) {
      console.log(chalk.red(' ✗ Wallet is not set up. Run "aura setup" first.'));
      return null;
    }

    const { password } = await inquirer.prompt([{
      type: 'password',
      name: 'password',
      message: chalk.magenta(' Script requests wallet access. Enter master password:'),
      // no mask → Ubuntu silent input
    }]);

    const privateKey = Vault.getKey(password);
    if (!privateKey) {
      console.log(chalk.red(' ✗ Invalid password. Access denied.'));
      return null;
    }

    console.log(chalk.green(' ✓ Wallet unlocked for script session.'));
    return new BlockchainExecutor(privateKey);
  };

  // ── Build context ──────────────────────────────────────────────────────────
  const context: ScriptContext = {
    executor: new BlockchainExecutor(undefined), // read-only by default
    ai: new AIInterpreter(),
    ui: {
      inquirer,
      chalk,
      ora,
      log: (msg: string) => console.log(msg),
    },
    args: scriptArgs,
    utils: { unlockWallet },
  };

  // ── Execute ────────────────────────────────────────────────────────────────
  console.log(chalk.cyan(`\n ➤ Running "${scriptName}"...\n`));

  try {
    await scriptFn(context);
    await syncActivity("SCRIPT_RUN", { name: scriptName, args: scriptArgs }, "Script executed successfully");
    console.log(chalk.green(`\n ✓ Script finished successfully.\n`));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n ✗ Script execution failed: ${msg}\n`));
  }
}