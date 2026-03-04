import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const BOILERPLATE = `
/**
 * Aura OS Custom Script
 * Built with ❤️ for the Web3 community
 */
export default async function(context) {
  const { ui, ai, executor, utils } = context;
  
  ui.log(ui.chalk.bold.cyan('\\n Hello from Aura Custom Script!'));
  
  // Example: Use AI inside your script
  // const response = await ai.chat("Write a short welcome message for a Web3 explorer.");
  // ui.log(ui.chalk.green(\`Aura AI says: \${response}\`));
  
  // Example: Access the current wallet/executor
  // const balance = await executor.execute({ action: 'CHECK_BALANCE', token: 'ETH' });
  // ui.log(ui.chalk.white(\` Current Balance: \${balance.data.balance} ETH\`));

  ui.log(ui.chalk.gray('\\n Script finished successfully.\\n'));
}
`;

export async function scriptCommand(args: string[]) {
  const action = args[0] || 'list';
  const name = args[1];

  const scriptsDir = path.join(process.cwd(), 'scripts');

  if (action === 'list') {
    if (!fs.existsSync(scriptsDir)) {
      console.log(chalk.yellow('\n ⚠ No scripts folder found. Create one to get started!'));
      console.log(chalk.gray('  Run: aura script create my-script\n'));
      return;
    }

    const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    
    if (files.length === 0) {
      console.log(chalk.yellow('\n ⚠ The scripts folder is empty.'));
      return;
    }

    console.log(chalk.bold.cyan('\n=== Available Aura Scripts ===\n'));
    files.forEach(f => {
      console.log(chalk.white(` - ${f.replace(/\.(ts|js)$/, '')} ${chalk.gray(`(scripts/${f})`)}`));
    });
    console.log(chalk.gray('\n Run a script with: aura run <name>\n'));
    return;
  }

  if (action === 'create') {
    if (!name) {
      console.log(chalk.red('\n Error: Please provide a name for your script.'));
      console.log(chalk.gray(' Usage: aura script create <name>\n'));
      return;
    }

    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir);
    }

    const fileName = name.endsWith('.ts') ? name : `${name}.ts`;
    const filePath = path.join(scriptsDir, fileName);

    if (fs.existsSync(filePath)) {
      console.log(chalk.red(`\n ✗ Error: Script "${fileName}" already exists.`));
      return;
    }

    fs.writeFileSync(filePath, BOILERPLATE.trim() + '\n');
    console.log(chalk.green(`\n ✓ Created new script: ${chalk.white(`scripts/${fileName}`)}`));
    console.log(chalk.gray(' Run it with:'), chalk.cyan(`aura run ${name}\n`));
    return;
  }

  console.log(chalk.red(`\n Unknown action: ${action}`));
  console.log(chalk.gray(' Valid actions: list, create\n'));
}
