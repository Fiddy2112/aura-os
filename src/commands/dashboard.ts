import { spawn } from 'child_process';
import path from 'path';
import chalk from 'chalk';

export async function dashboardCommand() {
  console.log(chalk.blue.bold('\n Starting Aura OS Dashboard...'));
  console.log(chalk.gray('    Press Ctrl+C to stop the dashboard\n'));
  
  const webPath = path.join(process.cwd(), 'web');
  
  const child = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    cwd: webPath,
    stdio: 'inherit',
    shell: true
  });

  child.on('error', (err) => {
    console.error(chalk.red('\n ❌ Failed to start dashboard:'), err.message);
  });
  
  // Handle process termination to kill the child process
  process.on('SIGINT', () => {
    child.kill();
    process.exit();
  });
}
