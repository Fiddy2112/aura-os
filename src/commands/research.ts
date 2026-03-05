import chalk from "chalk";
import { DeepResearcher } from "../core/ai/researcher.js";
import { syncActivity } from "../core/utils/supabase.js";
import inquirer from "inquirer";
import { SocialAgent } from "../core/ai/social.js";
import clipboardy from "clipboardy";

export async function researchCommand(args: string[]) {
  // ── Parse args: separate topic from flags ──────────────────────────────────
  const flags = args.filter(a => a.startsWith('--'));
  const topicParts = args.filter(a => !a.startsWith('--'));
  const topic = topicParts.join(' ').trim();
  const shareFlagProvided = flags.includes('--share');

  if (!topic) {
    console.log(chalk.yellow("\n⚠ Please specify a project to research."));
    console.log(chalk.gray('   Usage: aura research "Solana"'));
    console.log(chalk.gray('          aura research "Ethereum"'));
    console.log(chalk.gray('          aura research "Arbitrum"\n'));
    return null;
  }

  // Detect language from topic
  const isVietnamese =
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(topic);

  // ── Fetch research data ────────────────────────────────────────────────────
  console.log(chalk.gray(`\n Deep Research: "${topic}"...`));
  console.log(chalk.gray(" Gathering data from multiple sources...\n"));

  let result: Awaited<ReturnType<DeepResearcher['analyzeProject']>>;
  try {
    const researcher = new DeepResearcher();
    result = await researcher.analyzeProject(topic, {
      language: isVietnamese ? "vi" : "en",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.log(chalk.red(`\n❌ Research failed: ${msg}`));
    console.log(chalk.gray(" Check your API keys in .env file.\n"));
    return null;
  }

  if (result.sources.length === 0) {
    console.log(chalk.yellow(`\n⚠ No data found for "${topic}". Try a more specific name.\n`));
    return null;
  }

  console.log(chalk.gray(` Found ${result.sources.length} sources.\n`));

  // ── Display report ─────────────────────────────────────────────────────────
  displayResearchReport(result.report, result.sources, topic, isVietnamese);

  // ── Sync to dashboard (after display so user sees output immediately) ──────
  await syncActivity("RESEARCH", { topic, sources: result.sources.length }, result.report);

  // ── What next? menu ────────────────────────────────────────────────────────
  const choices = [
    { name: 'Generate Twitter/X Thread', value: 'thread' },
    { name: 'Save Report to File', value: 'save' },
    { name: 'Exit', value: 'exit' },
  ];

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: chalk.cyan(' What next?'),
    choices,
  }]);

  if (action === 'thread') {
    await generateAndDisplayThread(topic, result.report, shareFlagProvided);
  } else if (action === 'save') {
    await saveReportToFile(topic, result.report);
  }

  return result.report;
}

// ─── Generate & display Twitter thread ───────────────────────────────────────

async function generateAndDisplayThread(
  topic: string,
  report: string,
  autoShare: boolean
) {
  console.log(chalk.gray('\n Generating thread...\n'));

  const social = new SocialAgent();
  const thread = await social.generateThread(topic, report);

  console.log(chalk.gray('──────────────────────────────────────────'));
  console.log(chalk.bold.blue(' X / TWITTER THREAD PREVIEW'));
  console.log(chalk.gray('──────────────────────────────────────────\n'));

  thread.forEach((tweet, i) => {
    console.log(chalk.yellow(`[${i + 1}/${thread.length}]`));
    console.log(chalk.white(tweet));
    console.log(chalk.gray('---'));
  });

  // Ask to copy — skip prompt if --share flag was provided
  const shouldCopy = autoShare
    ? true
    : (await inquirer.prompt([{
        type: 'confirm',
        name: 'copy',
        message: chalk.green(' 📋 Copy full thread to clipboard?'),
        default: true,
      }])).copy;

  if (shouldCopy) {
    const fullText = thread.join('\n\n---\n\n');
    clipboardy.writeSync(fullText);
    console.log(chalk.green(' ✓ Copied! Ready to paste on X.\n'));
  }
}

// ─── Save report to file ──────────────────────────────────────────────────────

async function saveReportToFile(topic: string, report: string) {
  const { default: fs } = await import('fs');
  const { default: path } = await import('path');

  const filename = `aura-research-${topic.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.txt`;
  const filepath = path.join(process.cwd(), filename);

  fs.writeFileSync(filepath, report, 'utf8');
  console.log(chalk.green(` ✓ Report saved to ${filepath}\n`));
}

// ─── Display report ───────────────────────────────────────────────────────────

function displayResearchReport(
  report: string,
  sources: Array<{ title: string; url: string; source?: string }>,
  topic: string,
  isVietnamese: boolean
) {
  const divider = "━".repeat(60);
  const header = isVietnamese
    ? ` BÁO CÁO NGHIÊN CỨU: ${topic.toUpperCase()}`
    : ` RESEARCH REPORT: ${topic.toUpperCase()}`;

  console.log(chalk.cyan.bold(`\n${divider}`));
  console.log(chalk.cyan.bold(`  ${header}`));
  console.log(chalk.cyan.bold(divider));

  const lines = report.split("\n");
  for (const line of lines) {
    if (line.startsWith("PROJECT OVERVIEW:")     || line.startsWith("TỔNG QUAN DỰ ÁN:"))
      console.log(chalk.yellow.bold(`\n${line}`));
    else if (line.startsWith("TECHNOLOGY & PRODUCTS:") || line.startsWith("CÔNG NGHỆ & SẢN PHẨM:"))
      console.log(chalk.blue.bold(`\n${line}`));
    else if (line.startsWith("TEAM, GOVERNANCE & CONTROL:") || line.startsWith("ĐỘI NGŨ, QUẢN TRỊ & KIỂM SOÁT:"))
      console.log(chalk.magenta.bold(`\n${line}`));
    else if (line.startsWith("TOKEN MODEL & ECONOMICS:") || line.startsWith("MÔ HÌNH TOKEN & KINH TẾ:"))
      console.log(chalk.green.bold(`\n${line}`));
    else if (line.startsWith("ADOPTION & TRACTION:") || line.startsWith("ÁP DỤNG & TĂNG TRƯỞNG:"))
      console.log(chalk.cyan.bold(`\n${line}`));
    else if (line.startsWith("RISKS:") || line.startsWith("RỦI RO:"))
      console.log(chalk.red.bold(`\n${line}`));
    else if (line.startsWith("LIMITATIONS & UNKNOWNS:") || line.startsWith("HẠN CHẾ & CHƯA RÕ:"))
      console.log(chalk.gray.bold(`\n${line}`));
    else if (line.startsWith("DATA SOURCES USED:") || line.startsWith("NGUỒN DỮ LIỆU:"))
      console.log(chalk.gray(`\n${line}`));
    else if (line.includes("- High:")    || line.includes("- Cao:"))        console.log(chalk.red(`${line}`));
    else if (line.includes("- Medium:")  || line.includes("- Trung bình:")) console.log(chalk.yellow(`${line}`));
    else if (line.includes("- Low:")     || line.includes("- Thấp:"))       console.log(chalk.green(`${line}`));
    else if (line.includes("- Strengths:")  || line.includes("- Điểm mạnh:")) console.log(chalk.green(`${line}`));
    else if (line.includes("- Weaknesses:") || line.includes("- Điểm yếu:")) console.log(chalk.yellow(`${line}`));
    else if (line.includes("- Evidence:")   || line.includes("- Bằng chứng:")) console.log(chalk.blue(`${line}`));
    else if (line.startsWith("- ") || line.startsWith("• ")) console.log(chalk.white(`${line}`));
    else console.log(chalk.white(line));
  }

  // Sources footer
  console.log(chalk.gray(`\n${divider}`));
  console.log(chalk.gray(`  ${isVietnamese ? "Nguồn tham khảo" : "Data Sources"} (${sources.length}):`));
  sources.slice(0, 8).forEach((s, i) => {
    const sourceLabel = s.source || "Unknown";
    const isPremium =
      sourceLabel.includes("messari") ||
      sourceLabel.includes("theblock") ||
      sourceLabel.includes("delphi");
    const color = isPremium ? chalk.green : chalk.gray;
    const title = s.title.length > 60 ? s.title.slice(0, 60) + '...' : s.title;
    console.log(color(`  ${i + 1}. [${sourceLabel}] ${title}`));
  });
  if (sources.length > 8) {
    console.log(chalk.gray(`  ... and ${sources.length - 8} more sources`));
  }
  console.log('');
}