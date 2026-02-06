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

export async function runCommand(scriptName: string, args: string[]) {
  if (!scriptName) {
    console.log(chalk.red('\n Error: Please provide a script name.'));
    console.log(chalk.gray(' Usage: aura run <script-name> [args]'));
    console.log(chalk.gray(' Example: aura run sweep-tokens'));
    return;
  }

  // 1. Resolve Script Path
  // We look in current directory "./scripts" or direct path
  const cwd = process.cwd();
  const potentialPaths = [
    path.resolve(cwd, scriptName),
    path.resolve(cwd, 'scripts', scriptName),
    path.resolve(cwd, 'scripts', `${scriptName}.ts`),
    path.resolve(cwd, 'scripts', `${scriptName}.js`),
    path.resolve(cwd, scriptName + '.ts'),
    path.resolve(cwd, scriptName + '.js')
  ];

  let scriptPath = potentialPaths.find(p => fs.existsSync(p));

  if (!scriptPath) {
    console.log(chalk.red(`\n ✗ Script not found: ${scriptName}`));
    console.log(chalk.gray(` Searched in: ./scripts/`));
    return;
  }

  console.log(chalk.gray(`\n Loading script: ${path.basename(scriptPath)}...`));

  console.log(chalk.yellow.bold(`\n ⚠️  SECURITY WARNING ⚠️`));
  console.log(chalk.white(` You are about to execute an external script:`));
  console.log(chalk.gray(` File: ${scriptPath}`));
  console.log(chalk.white(` Only run scripts from sources you trust completely.`));

  try {
    // 2. Import the script
    // Using pathToFileURL is necessary for ESM imports of local files on Windows
    const scriptUrl = pathToFileURL(scriptPath).toString();
    const module = await import(scriptUrl);
    
    // Check if default export exists and is a function
    const scriptFn: AuraScript = module.default;
    if (typeof scriptFn !== 'function') {
      console.log(chalk.red(`\n ✗ Error: Script must export a default function.`));
      console.log(chalk.gray(` export default async function(context) { ... }`));
      return;
    }

    const unlockWallet = async ():Promise <BlockchainExecutor | null> =>{
        if(!Vault.isSetup()){
            console.log(chalk.red(' ✗ Wallet is not setup. Cannot unlock.'));
            return null;
        }

        const { password } = await inquirer.prompt([{
            type:'password',
            name:'password',
            message: chalk.magenta('Script requests wallet access. Enter password:'),
            mask: '*'
        }])

        const privateKey = Vault.getKey(password);
        if(privateKey){
            console.log(chalk.green(' Wallet unlocked for script session.'));
            return new BlockchainExecutor(privateKey);
        }else {
            console.log(chalk.red(' ✗ Invalid password. Access denied.'));
            return null;
        }
    }

    // 3. Prepare Context
    const isSetup = Vault.isSetup();
    let privateKey: string | null = null;
    
    // Ask for password if not unlocked (optional? For now let's assume scripts might need it)
    // To be safe, we don't force unlock unless the script specifically asks, 
    // but here we just initialize the executor. 
    // If the script tries to use sensitive executor features, it will need a key.
    // For now, let's auto-prompt if we think they might need it, or we can expose a helper in context to "unlock".
    // Let's expose a "headless" executor. If they need to sign, we might need a better flow.
    // OR: We just ask for password upfront if `aura run` is used? No, that's annoying for read-only scripts.
    
    // Better: Helper in Context to unlock.
    // But for V1, let's just initialize executor with null key. 
    // If they need to sign, they can fail or we prompt?
    // Actually, let's prompt ONLY if the user passes a flag or we can just prompt inside the script?
    // We can't easily pass the private key prompt logic to the script unless we expose a specific function.
    
    // Let's ask for password upfront IF they pass --secure flag? 
    // Or just let them prompt inside the script?
    // Let's implement a `unlock()` helper in the context.

    const context: ScriptContext = {
      executor: new BlockchainExecutor(undefined), // Public only by default
      ai: new AIInterpreter(),
      ui: {
        inquirer,
        chalk,
        ora,
        log: (msg: string) => console.log(msg),
      },
      args,
      utils: {
        unlockWallet
      }
    };

    // 4. Run Script
    console.log(chalk.cyan(`\n ➤ Running ${scriptName}...`));
    await scriptFn(context);
    console.log(chalk.green(`\n ✓ Script finished successfully.`));

  } catch (error) {
    console.error(chalk.red(`\n ✗ Script execution failed:`));
    if (error instanceof Error) {
      console.error(chalk.red(`   ${error.message}`));
    } else {
      console.error(error);
    }
  }
}
