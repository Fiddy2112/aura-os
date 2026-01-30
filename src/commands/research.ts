import chalk from "chalk";
import { CryptoResearcher } from "../core/ai/researcher.js";
import { AIInterpreter } from "../core/ai/interpreter.js";
import { syncActivity } from "../core/utils/supabase.js";

export async function researchCommand(topic?: string) {
  const researcher = new CryptoResearcher();
  const interpreter = new AIInterpreter();

  // Determine query and detect language
  const isVietnamese = topic
    ? /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
        topic
      )
    : false;

  const query =
    topic ||
    (isVietnamese
      ? "Tóm tắt thị trường crypto hôm nay"
      : "Crypto market summary today and trending news");

  console.log(chalk.gray(`\n Researching: "${query}"...`));

  try {
    // Fetch research data
    const data = await researcher.research(query, {
      limit: 5,
      language: isVietnamese ? "vi" : "en",
    });

    if (data.length === 0) {
      console.log(chalk.yellow("\n No results found. Try a different query."));
      return null;
    }

    // Combine content for summarization
    const rawText = data.map((d) => `[${d.source}] ${d.content}`).join("\n\n");

    // AI Summary
    console.log(chalk.gray(" Analyzing with AI..."));
    const summary = await interpreter.summarize(rawText, topic);

    // Sync to dashboard
    await syncActivity("RESEARCH", { topic, sources: data.length }, summary);

    // Display results
    console.log(chalk.cyan.bold("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
    console.log(chalk.cyan.bold("  AURA RESEARCH REPORT"));
    console.log(chalk.cyan.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));

    console.log(chalk.white(summary));

    console.log(chalk.gray("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
    console.log(chalk.gray("  Sources:"));
    data.forEach((d) => {
      const sourceColor =
        d.source?.includes("messari") || d.source?.includes("theblock")
          ? chalk.green
          : chalk.gray;
      console.log(sourceColor(`  • ${d.title}`));
      console.log(chalk.gray(`    ${d.url}`));
    });
    console.log("");

    return summary;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.log(chalk.red(`\n Research failed: ${errorMessage}`));
    console.log(
      chalk.gray(" Check your TAVILY_API_KEY in .env file.\n")
    );
    return null;
  }
}
