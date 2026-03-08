import chalk from 'chalk';
import ora from 'ora';
import { isAddress } from 'viem';
import { AIInterpreter } from '../core/ai/interpreter.js';
import { NewsSearcher } from '../core/ai/news.js';
import { getPublicClient } from '../core/blockchain/chains.js';
import { getContractInfo } from '../core/engine/info.js';
import { analyzePrivileges } from '../core/engine/privilege.js';

// ── On-chain contract summary ─────────────────────────────────────────────────

async function buildContractContext(address: `0x${string}`): Promise<string> {
  const client = getPublicClient();
  const code   = await client.getCode({ address });

  if (!code || code === '0x') return `Address ${address} is an EOA (wallet), not a smart contract.`;

  const [info, priv] = await Promise.all([
    getContractInfo(address),
    analyzePrivileges(address),
  ]);

  const lines: string[] = [
    `Contract Address: ${address}`,
    `Chain: ${info.chain}`,
    `Type: ${info.isProxy ? `Proxy → ${priv.implementation ?? 'unknown'}` : 'Direct contract'}`,
    `Standards: ${Object.entries(info.standards).filter(([,v]) => v).map(([k]) => k).join(', ') || 'None detected'}`,
  ];

  if (info.token?.name)   lines.push(`Token Name: ${info.token.name}`);
  if (info.token?.symbol) lines.push(`Token Symbol: ${info.token.symbol}`);
  if (info.token?.totalSupply !== undefined && info.token?.decimals !== undefined) {
    const supply = Number(info.token.totalSupply) / 10 ** info.token.decimals;
    lines.push(`Total Supply: ${supply.toLocaleString()} ${info.token.symbol}`);
  }

  lines.push(`Capabilities: ${priv.capabilities.join(', ') || 'None'}`);
  lines.push(`Owner: ${priv.owner ?? 'None'} (${priv.ownerType})`);
  lines.push(`Ownership renounced: ${priv.isRenounced}`);
  lines.push(`Has timelock: ${priv.hasTimelock}`);
  lines.push(`Function selectors (${info.selectorCount}): ${info.functionSelectors.slice(0, 10).join(', ')}`);

  if (info.deployment) {
    lines.push(`Deployed: block ${info.deployment.blockNumber} (~${info.deployment.ageInDays} days ago)`);
  }

  return lines.join('\n');
}

// ── News context ──────────────────────────────────────────────────────────────

async function fetchNewsContext(query: string): Promise<string> {
  try {
    const searcher = new NewsSearcher();
    const results  = await searcher.search(`${query} protocol explained how it works`, { limit: 4 });
    if (results.length === 0) return '';
    return results.map(r => `[${r.source}] ${r.title}\n${r.content.slice(0, 400)}`).join('\n\n');
  } catch { return ''; }
}

// ── AI summarize ──────────────────────────────────────────────────────────────

async function generateSummary(
  subject:         string,
  contractContext: string,
  newsContext:     string,
  lang:            'en' | 'vi',
): Promise<string> {
  const langNote = lang === 'vi' ? 'Respond in Vietnamese.' : 'Respond in English.';

  const system = `
    You are Aura OS, a plain-English Web3 protocol explainer.
    Your job is to explain what a smart contract or DeFi protocol does in simple terms.

    Rules:
    - Explain like you're talking to a curious person who understands basic crypto but not Solidity
    - Focus on: what it does, how it works, who controls it, what risks exist
    - Use bullet points for key facts
    - If this looks like a scam or has unusual risk flags, say so clearly
    - ${langNote}
    - Max 300 words`;

    const user = `Explain this contract/protocol: "${subject}"

    ON-CHAIN DATA:
    ${contractContext || 'No on-chain data available.'}

    ${newsContext ? `WEB CONTEXT:\n${newsContext}` : ''}`;

  const interpreter = new AIInterpreter();
  return interpreter.chat(user, system);
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function summarizeCommand(args: string[]): Promise<void> {
  const input  = args.filter(a => !a.startsWith('--')).join(' ');
  const viMode = args.includes('--vi') || args.includes('--vietnamese');
  const lang   = viMode ? 'vi' : 'en';

  if (!input || input === '--help') {
    console.log(chalk.bold.cyan('\n  aura summarize <contract-address | protocol-name>\n'));
    console.log(chalk.gray('  AI-powered plain-English explanation of any contract or protocol.\n'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura summarize uniswap'));
    console.log(chalk.gray('    aura summarize 0xA0b869...  (USDC contract)'));
    console.log(chalk.gray('    aura summarize aave --vi    (Vietnamese output)\n'));
    return;
  }

  const isContractAddress = isAddress(input);
  const spinner = ora(chalk.cyan(` Analyzing ${isContractAddress ? 'contract' : `"${input}"`}...`)).start();

  try {
    let contractContext = '';
    let newsContext     = '';

    // Fetch in parallel where possible
    if (isContractAddress) {
      [contractContext, newsContext] = await Promise.all([
        buildContractContext(input as `0x${string}`),
        fetchNewsContext(input),
      ]);
    } else {
      newsContext = await fetchNewsContext(input);
    }

    spinner.text = chalk.cyan(' Generating explanation...');
    const summary = await generateSummary(input, contractContext, newsContext, lang);
    spinner.stop();

    const divider = chalk.gray('─'.repeat(56));
    console.log(chalk.bold.cyan(`\n  Summary: ${chalk.white(isContractAddress ? `${input.slice(0, 10)}...` : input)}`));
    console.log(divider);
    console.log('');

    // Indent each line for CLI readability
    for (const line of summary.split('\n')) {
      console.log(`  ${line}`);
    }
    console.log('');

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`\n  Error: ${error instanceof Error ? error.message : String(error)}\n`));
  }
}