import chalk from 'chalk';
import { researchCommand } from './research.js';
import { syncActivity } from '../core/utils/supabase.js';

export async function watchCommand(intervalMinutes: number = 15) {
  console.log(chalk.cyan(`\n Aura Watch Mode Activated.`));
  console.log(chalk.gray(` Scanning for Alpha every ${intervalMinutes} minutes...`));
  console.log(chalk.gray(` Results will be synced to your dashboard.\n`));

  await performWatch();
  setInterval(async () => {
    await performWatch();
  }, intervalMinutes * 60 * 1000);
}

async function performWatch() {
  const timestamp = new Date().toLocaleTimeString();
  console.log(chalk.gray(`[${timestamp}] Aura is hunting for news...`));

  try {
    const topics = ["Sui ecosystem alpha leaks", "Top crypto narratives today"];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];

    const summary = await researchCommand(randomTopic);

    if (summary) {
      console.log(chalk.green(` Alpha found and synced!`));
    }
  } catch (error) {
    console.error(chalk.red(` Watch error: ${error.message}`));
  }
}