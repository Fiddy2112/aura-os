import chalk from 'chalk';
import { AIInterpreter } from '../core/ai/interpreter.js';
import { syncActivity } from '../core/utils/supabase.js';

const SYSTEM_PROMPT = `
  You are Aura, an expert Web3 and Solidity assistant embedded in a developer CLI tool.
  You answer questions about:
  - Solidity smart contract development
  - EVM internals (opcodes, gas, storage layout)
  - DeFi protocols (Uniswap, Aave, Compound, Curve, etc.)
  - Blockchain concepts (consensus, cryptography, MEV, L2s)
  - Security vulnerabilities (reentrancy, flash loans, oracle manipulation)
  - Best practices and design patterns

  Rules:
  - Be concise and precise. Developers don't want fluff.
  - For code questions: provide clean, working Solidity/TypeScript code with brief comments.
  - For concept questions: explain clearly but avoid over-simplifying.
  - Never give financial advice.
  - If you don't know something, say so directly.
  - Output plain text only. No markdown headers. Use code blocks sparingly and only when code is requested.
`;

export default async function askCommand(args: string[]) {
  const codeMode    = args.includes('--code');
  const explainMode = args.includes('--explain');
  const question    = args.filter(a => !a.startsWith('--')).join(' ').trim();

  if (!question) {
    console.error(chalk.red('\n  Error: Question is required'));
    console.log(chalk.gray('  Usage: aura ask "<question>" [--code] [--explain]'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura ask "What is a reentrancy attack?"'));
    console.log(chalk.gray('    aura ask "How does Uniswap V3 liquidity work?" --explain'));
    console.log(chalk.gray('    aura ask "Write an ERC-20 with max wallet limit" --code\n'));
    process.exit(1);
  }

  // Build enriched prompt
  let enrichedQuestion = question;
  if (codeMode)    enrichedQuestion += '\n\nPlease provide a working code example.';
  if (explainMode) enrichedQuestion += '\n\nExplain this simply, as if to a developer who is new to this concept.';

  console.log(chalk.gray(`\n Aura is thinking...\n`));

  try {
    const interpreter = new AIInterpreter();
    const answer = await interpreter.chat(enrichedQuestion, SYSTEM_PROMPT);

    if (!answer) {
      console.log(chalk.red('\n No response received. Check your AI API keys.\n'));
      return;
    }

    // ── Display ─────────────────────────────────────────────────────────────
    const divider = '─'.repeat(60);
    console.log(chalk.bold.cyan(`\n⚡ Aura Knowledge`));
    console.log(chalk.gray(` Q: ${question}`));
    console.log(chalk.gray(divider));

    // Detect code blocks and color them
    const lines = answer.split('\n');
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        console.log(chalk.gray(line));
        continue;
      }
      if (inCodeBlock) {
        console.log(chalk.yellow(line));
      } else {
        console.log(chalk.white(line));
      }
    }

    console.log(chalk.gray(`\n${divider}\n`));

    await syncActivity('ASK', { question }, answer.slice(0, 200));

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  Error: ${msg}\n`));
    process.exit(1);
  }
}