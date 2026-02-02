import chalk from "chalk";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NewsSearcher } from "../core/ai/news.js";
import { syncActivity } from "../core/utils/supabase.js";

// News Analyst prompt template
function getNewsAnalystPrompt(topic: string): string {
  return `You are a crypto news analyst and explainer.

    Your task is to analyze the provided news articles about ${topic} and produce a clear, neutral, and trustworthy news summary.
    This task is strictly limited to NEWS reporting and explanation.
    This is NOT deep research and NOT investment advice.

    Audience:
    - Assume the reader may be non-technical.
    - Use simple language and avoid jargon whenever possible.
    - If technical terms are unavoidable, briefly explain them in plain words.

    Instructions:

    1. Identify the main events explicitly reported across the sources.
    2. Separate information into facts, reported impacts, and uncertainties.
    3. Do NOT add any interpretation, assumption, or consequence that is not stated or clearly implied in the sources.
    4. If multiple sources confirm the same information, treat it as higher confidence.
    5. If sources disagree or information is unclear, explicitly state the disagreement or uncertainty.
    6. Do NOT speculate about price, future performance, or long-term outcomes.
    7. Do NOT give investment advice or personal opinions.

    Output strictly in the following format:

    OVERVIEW:
    - A concise and neutral summary of what is happening, based only on reported events.

    KEY EVENTS:
    - [Event] Describe what happened.
    - Category: Product / Tech / Token / Team / Market / Regulation
    - Who is affected: users / developers / the project / the market
    - Confidence: High / Medium / Low

    WHY IT MATTERS:
    - Explain why this news is notable or widely discussed now, without predicting future outcomes.

    CONFIRMED FACTS:
    - List only clearly stated facts or announcements.
    - Avoid deep technical implementation details.

    UNCERTAINTIES & OPEN QUESTIONS:
    - List what is unclear, disputed, or not yet confirmed by the sources.

    WHAT TO WATCH NEXT:
    - Mention concrete upcoming events, statements, or decisions referenced by the sources.
    - Avoid predictions or speculative language.

    IMPORTANT:
    - Keep the output clean, concise, and readable for both Terminal (CLI) and Web interfaces.`;
}

export async function newsCommand(topic?: string) {
  const newsSearcher = new NewsSearcher();

  // Determine topic and detect language
  const isVietnamese = topic
    ? /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
        topic
      )
    : false;

  const query =
    topic ||
    (isVietnamese
      ? "Tin tức crypto blockchain hôm nay"
      : "Latest cryptocurrency blockchain news today");

  console.log(chalk.gray(`\n📰 Fetching news about: "${query}"...`));

  try {
    // Fetch news data from trusted sources
    const data = await newsSearcher.search(query, {
      limit: 8,
      categories: ["news", "alpha"],
      language: isVietnamese ? "vi" : "en",
    });

    if (data.length === 0) {
      console.log(chalk.yellow("\n⚠ No news articles found. Try a different topic."));
      return null;
    }

    // Combine content for analysis
    const sourcesContext = data
      .map(
        (d, i) =>
          `[Source ${i + 1}: ${d.source}]\nTitle: ${d.title}\nContent: ${d.content}\nURL: ${d.url}`
      )
      .join("\n\n---\n\n");

    console.log(chalk.gray(` Found ${data.length} sources. Analyzing with AI...`));

    // Generate news analysis using AI
    const analysis = await analyzeNews(sourcesContext, query, isVietnamese);

    // Sync to dashboard
    await syncActivity("NEWS", { topic: query, sources: data.length }, analysis);

    // Display results
    displayNewsReport(analysis, data, isVietnamese);

    return analysis;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.log(chalk.red(`\n❌ News analysis failed: ${errorMessage}`));
    console.log(chalk.gray(" Check your API keys in .env file.\n"));
    return null;
  }
}

async function analyzeNews(
  sourcesContext: string,
  topic: string,
  isVietnamese: boolean
): Promise<string> {
  const openai = new OpenAI();
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  const systemPrompt = getNewsAnalystPrompt(topic);
  const languageNote = isVietnamese
    ? "\n\nIMPORTANT: The user speaks Vietnamese. Output the analysis in Vietnamese."
    : "";

  const userContent = `Analyze these news articles:\n\n${sourcesContext}${languageNote}`;

  // Try OpenAI first
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
    });

    return completion.choices[0].message.content || "Unable to analyze news.";
  } catch {
    console.log(chalk.gray(" OpenAI unavailable, trying Groq..."));

    // Try Groq
    try {
      const groqResponse = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.3,
      });

      return groqResponse.choices[0].message.content || "Unable to analyze news.";
    } catch {
      console.log(chalk.gray(" Groq unavailable, trying Gemini..."));

      // Try Gemini
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const fullPrompt = `${systemPrompt}\n\n${userContent}`;
        const result = await model.generateContent(fullPrompt);
        return result.response.text();
      } catch {
        throw new Error("All AI models failed to analyze the news.");
      }
    }
  }
}

function displayNewsReport(
  analysis: string,
  sources: Array<{ title: string; url: string; source?: string }>,
  isVietnamese: boolean
) {
  const divider = "━".repeat(50);

  console.log(chalk.cyan.bold(`\n${divider}`));
  console.log(
    chalk.cyan.bold(`  📰 ${isVietnamese ? "BÁO CÁO TIN TỨC AURA" : "AURA NEWS REPORT"}`)
  );
  console.log(chalk.cyan.bold(divider));

  // Display the analysis with section coloring
  const lines = analysis.split("\n");
  for (const line of lines) {
    if (
      line.startsWith("OVERVIEW:") ||
      line.startsWith("TỔNG QUAN:")
    ) {
      console.log(chalk.yellow.bold(`\n${line}`));
    } else if (
      line.startsWith("KEY EVENTS:") ||
      line.startsWith("SỰ KIỆN CHÍNH:")
    ) {
      console.log(chalk.magenta.bold(`\n${line}`));
    } else if (
      line.startsWith("WHY IT MATTERS:") ||
      line.startsWith("TẠI SAO QUAN TRỌNG:")
    ) {
      console.log(chalk.blue.bold(`\n${line}`));
    } else if (
      line.startsWith("CONFIRMED FACTS:") ||
      line.startsWith("SỰ THẬT ĐÃ XÁC NHẬN:")
    ) {
      console.log(chalk.green.bold(`\n${line}`));
    } else if (
      line.startsWith("UNCERTAINTIES") ||
      line.startsWith("NHỮNG ĐIỀU CHƯA RÕ")
    ) {
      console.log(chalk.red.bold(`\n${line}`));
    } else if (
      line.startsWith("WHAT TO WATCH") ||
      line.startsWith("NHỮNG GÌ CẦN THEO DÕI")
    ) {
      console.log(chalk.cyan.bold(`\n${line}`));
    } else if (line.includes("Confidence: High") || line.includes("Độ tin cậy: Cao")) {
      console.log(chalk.green(`  ${line.trim()}`));
    } else if (line.includes("Confidence: Medium") || line.includes("Độ tin cậy: Trung bình")) {
      console.log(chalk.yellow(`  ${line.trim()}`));
    } else if (line.includes("Confidence: Low") || line.includes("Độ tin cậy: Thấp")) {
      console.log(chalk.red(`  ${line.trim()}`));
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      console.log(chalk.white(`${line}`));
    } else {
      console.log(chalk.white(line));
    }
  }

  // Display sources
  console.log(chalk.gray(`\n${divider}`));
  console.log(chalk.gray(` ${isVietnamese ? "Nguồn tham khảo:" : "Sources:"}`));
  sources.forEach((d, i) => {
    const sourceLabel = d.source || "Unknown";
    console.log(chalk.gray(`  ${i + 1}. [${sourceLabel}] ${d.title}`));
    console.log(chalk.gray.dim(`     ${d.url}`));
  });
  console.log("");
}
