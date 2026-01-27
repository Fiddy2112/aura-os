import chalk from 'chalk';
import { AIInterpreter } from '../core/ai/interpreter.js';

export async function chatCommand(userInput: string) {
  const interpreter = new AIInterpreter();
  
  console.log(chalk.gray('Aura is thinking...'));
  
  const intent = await interpreter.parse(userInput);

  if (!intent || intent.action === "REJECTED") {
    console.log(chalk.red(`\n❌ Refuse: ${intent?.reason || "The question is unrelated to Web3."}`));
    return;
  }


  console.log(chalk.green(`\n✅ Valid command: ${intent.action}`));
  console.log(chalk.cyan(`   Token: ${intent.token || 'N/A'}`));
  console.log(chalk.cyan(`   Amount: ${intent.amount || 'N/A'}`));

}