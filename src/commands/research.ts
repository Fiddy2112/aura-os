import chalk from "chalk";
import { DeepResearcher } from "../core/ai/researcher.js";
import { syncActivity } from "../core/utils/supabase.js";

export async function researchCommand(topic?: string) {
  const researcher = new DeepResearcher();

  // Determine project and detect language
  const isVietnamese = topic
    ? /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
        topic
      )
    : false;

  if (!topic) {
    console.log(chalk.yellow("\n⚠ Please specify a project to research."));
    console.log(chalk.gray('   Usage: aura research "Solana"'));
    console.log(chalk.gray('          aura research "Ethereum"'));
    console.log(chalk.gray('          aura research "Arbitrum"\n'));
    return null;
  }

  console.log(chalk.gray(`\n Deep Research: "${topic}"...`));
  console.log(chalk.gray(" Gathering data from multiple sources..."));

  try {
    // Perform deep project analysis
    const result = await researcher.analyzeProject(topic, {
      language: isVietnamese ? "vi" : "en",
    });

    if (result.sources.length === 0) {
      console.log(chalk.yellow(`\n⚠ No data found for "${topic}". Try a more specific name.`));
      return null;
    }

    console.log(chalk.gray(` Found ${result.sources.length} sources. Generating report...`));

    // Sync to dashboard
    await syncActivity("RESEARCH", { topic, sources: result.sources.length }, result.report);

    // Display structured research report
    displayResearchReport(result.report, result.sources, topic, isVietnamese);

    return result.report;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.log(chalk.red(`\n❌ Research failed: ${errorMessage}`));
    console.log(chalk.gray(" Check your API keys in .env file.\n"));
    return null;
  }
}

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

  // Display the report with section coloring
  const lines = report.split("\n");
  for (const line of lines) {
    // Section headers
    if (
      line.startsWith("PROJECT OVERVIEW:") ||
      line.startsWith("TỔNG QUAN DỰ ÁN:")
    ) {
      console.log(chalk.yellow.bold(`\n${line}`));
    } else if (
      line.startsWith("TECHNOLOGY & PRODUCTS:") ||
      line.startsWith("CÔNG NGHỆ & SẢN PHẨM:")
    ) {
      console.log(chalk.blue.bold(`\n${line}`));
    } else if (
      line.startsWith("TEAM, GOVERNANCE & CONTROL:") ||
      line.startsWith("ĐỘI NGŨ, QUẢN TRỊ & KIỂM SOÁT:")
    ) {
      console.log(chalk.magenta.bold(`\n${line}`));
    } else if (
      line.startsWith("TOKEN MODEL & ECONOMICS:") ||
      line.startsWith("MÔ HÌNH TOKEN & KINH TẾ:")
    ) {
      console.log(chalk.green.bold(`\n${line}`));
    } else if (
      line.startsWith("ADOPTION & TRACTION:") ||
      line.startsWith("ÁP DỤNG & TĂNG TRƯỞNG:")
    ) {
      console.log(chalk.cyan.bold(`\n${line}`));
    } else if (line.startsWith("RISKS:") || line.startsWith("RỦI RO:")) {
      console.log(chalk.red.bold(`\n${line}`));
    } else if (
      line.startsWith("LIMITATIONS & UNKNOWNS:") ||
      line.startsWith("HẠN CHẾ & CHƯA RÕ:")
    ) {
      console.log(chalk.gray.bold(`\n${line}`));
    } else if (
      line.startsWith("DATA SOURCES USED:") ||
      line.startsWith("NGUỒN DỮ LIỆU:")
    ) {
      console.log(chalk.gray(`\n${line}`));
    }
    // Risk levels
    else if (line.includes("- High:") || line.includes("- Cao:")) {
      console.log(chalk.red(`${line}`));
    } else if (line.includes("- Medium:") || line.includes("- Trung bình:")) {
      console.log(chalk.yellow(`${line}`));
    } else if (line.includes("- Low:") || line.includes("- Thấp:")) {
      console.log(chalk.green(`${line}`));
    }
    // Sub-headers
    else if (line.includes("- Strengths:") || line.includes("- Điểm mạnh:")) {
      console.log(chalk.green(`${line}`));
    } else if (line.includes("- Weaknesses:") || line.includes("- Điểm yếu:")) {
      console.log(chalk.yellow(`${line}`));
    } else if (line.includes("- Evidence:") || line.includes("- Bằng chứng:")) {
      console.log(chalk.blue(`${line}`));
    }
    // Regular lines
    else if (line.startsWith("- ") || line.startsWith("• ")) {
      console.log(chalk.white(`${line}`));
    } else {
      console.log(chalk.white(line));
    }
  }

  // Display sources footer
  console.log(chalk.gray(`\n${divider}`));
  console.log(
    chalk.gray(`  ${isVietnamese ? "Nguồn tham khảo" : "Data Sources"} (${sources.length}):`)
  );
  sources.slice(0, 8).forEach((s, i) => {
    const sourceLabel = s.source || "Unknown";
    const isResearchSource =
      sourceLabel.includes("messari") ||
      sourceLabel.includes("theblock") ||
      sourceLabel.includes("delphi");
    const color = isResearchSource ? chalk.green : chalk.gray;
    console.log(color(`  ${i + 1}. [${sourceLabel}] ${s.title.slice(0, 60)}${s.title.length > 60 ? '...' : ''}`));
  });
  if (sources.length > 8) {
    console.log(chalk.gray(`  ... and ${sources.length - 8} more sources`));
  }
  console.log("");
}
