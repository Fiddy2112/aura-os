import chalk from 'chalk';
import { researchCommand } from './research.js';
import { syncActivity } from '../core/utils/supabase.js';

const WATCH_TOPICS = [
  "Sui ecosystem alpha",
  "Top crypto narratives today",
  "DeFi alpha this week",
  "Layer 2 news today",
  "Solana ecosystem updates",
];

export async function watchCommand(intervalMinutes: number = 15) {
  console.log(chalk.cyan(`\n ◉ Aura Watch Mode`));
  console.log(chalk.gray(` Scanning for alpha every ${intervalMinutes} minutes.`));
  console.log(chalk.gray(` Results sync to your dashboard automatically.`));
  console.log(chalk.gray(` Press Ctrl+C to stop.\n`));

  // Run immediately on start, then on interval
  await performWatch();

  const timer = setInterval(async () => {
    await performWatch();
  }, intervalMinutes * 60 * 1000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(timer);
    console.log(chalk.gray('\n\n Watch stopped.\n'));
    process.exit(0);
  });
}

async function performWatch() {
  const timestamp = new Date().toLocaleTimeString();
  const topic = WATCH_TOPICS[Math.floor(Math.random() * WATCH_TOPICS.length)];

  console.log(chalk.gray(`\n[${timestamp}] Hunting: "${topic}"...`));

  try {
    // researchCommand now takes args: string[] — pass topic as single arg
    const summary = await researchCommand([topic]);

    if (summary) {
      await syncActivity("WATCH", { topic }, summary);
      console.log(chalk.green(` ✓ Alpha found and synced to dashboard.`));
    } else {
      console.log(chalk.yellow(` No results for "${topic}". Will retry next cycle.`));
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(` Watch error: ${msg}`));
  }
}