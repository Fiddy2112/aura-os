import OpenAI from "openai";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NewsSearcher, type SearchResult } from "./news.js";
import { PolymarketPlugin } from "./plugins/polymarket.js";
import chalk from "chalk";

/**
 * Deep Research Prompt for structured project analysis
 */
function getDeepResearchPrompt(project: string): string {
  return `You are a professional crypto research analyst and sentiment expert.

  Your task is to produce a structured, evidence-driven research report about ${project}. 
  This task is analytical research, NOT news summarization and NOT investment advice.

  ========================
  STRICT BOUNDARIES
  ========================
  - Use ONLY information explicitly present in the provided sources and the [PREDICTION MARKET DATA].
  - If Prediction Market data (Polymarket) is available, it MUST be used to contextualize market sentiment and speculative risk.
  - Do NOT rely on prior knowledge, common crypto narratives, or assumptions.
  - If evidence is missing or unclear, explicitly state: "insufficient data".
  - Do NOT infer intent, future outcomes, or motivations beyond what sources state.
  - IF SOURCES CONFLICT: Explicitly note the discrepancy and cite both conflicting sources (e.g., "Source 1 claims X, while Source 2 indicates Y").

  ========================
  AUDIENCE
  ========================
  - The reader understands basic crypto concepts.
  - Use precise, neutral, and analytical language.
  - Avoid marketing, hype, or opinionated phrasing.

  ========================
  MANDATORY RESEARCH PRINCIPLES
  ========================
  - Every factual claim MUST be supported by an inline citation to the source index, e.g., "Mainnet launched in Q1 [Source 1]."
  - If a claim cannot be fully supported, label it as "unsupported".
  - Clearly distinguish between:
    - FACTS (directly stated or observable)
    - CLAIMED PURPOSE (what the project says about itself)
    - INTERPRETATIONS (explicitly marked and evidence-based)
  - Market data MUST include a timestamp or reference date.

  ========================
  RESEARCH FLOW (FOLLOW STRICTLY)
  ========================

  1. PROJECT DEFINITION
  - FACTS: What is the project? When was it created?
  - CLAIMED PURPOSE: What problem does it claim to solve?
  - CATEGORY: L1, L2, DeFi, AI Agent, etc.

  2. TECHNOLOGY & SECURITY
  - IMPLEMENTATION: What is live? What is inherited?
  - MATURITY: idea / testnet / mainnet / production.
  - SECURITY: Audit history, multisig setup, and bug bounties.
  - TECHNICAL TRADE-OFFS: Design constraints or limitations.
  - EVIDENCE: Repos, technical documentation.

  3. TEAM, GOVERNANCE & CONTROL
  - FACTS: Who controls upgrades/decisions?
  - GOVERNANCE: DAO, multisig, or foundation.
  - CENTRALIZATION POINTS: Who has final override power?

  4. TOKEN MODEL & ECONOMICS
  - ROLE: Is the token required for core functionality?
  - SUPPLY & DISTRIBUTION: Total/circulating supply, unlocks.
  - INCENTIVES: Who benefits? Who bears economic risk?

  5. ADOPTION, TRACTION & MARKET SENTIMENT
  - USAGE SIGNALS: On-chain activity (TVL, active users).
  - MARKET METRICS: Cap, FDV, 24h Volume (with dates).
  - PREDICTION MARKET SENTIMENT:
    - Analyze 'Odds' and 'Volume' from [PREDICTION MARKET DATA].
    - Does the market bet 'Yes' or 'No' on this project's success or specific milestones?
    - High volume indicates high conviction or significant conflict in sentiment.

  6. RISK ANALYSIS
  - HIGH RISK: Risks materially affecting functionality, governance, or economics. 
    - Integration: If Polymarket 'Yes' odds are < 30% for key milestones, evaluate as High Execution Risk.
  - MEDIUM RISK: Risks with moderate impact.
  - LOW RISK: Minor or mitigated risks.
  - For EACH risk: Explain WHY and cite EVIDENCE.

  7. LIMITATIONS & UNKNOWNS
  - Missing data or unverified claims.

  ========================
  RULES
  ========================
  - Do NOT speculate or predict price.
  - Do NOT provide investment recommendations.
  - Maintain a neutral, analytical, research-only tone.

  ========================
  OUTPUT FORMAT (STRICT)
  ========================

  PROJECT OVERVIEW:
  - FACTS:
  - CLAIMED PURPOSE:
  - CATEGORY:

  TECHNOLOGY & SECURITY:
  - IMPLEMENTATION:
  - MATURITY:
  - SECURITY:
  - TRADE-OFFS:
  - EVIDENCE:

  TEAM, GOVERNANCE & CONTROL:
  - FACTS:
  - CENTRALIZATION POINTS:
  - EVIDENCE:

  TOKEN MODEL & ECONOMICS:
  - ROLE:
  - SUPPLY & DISTRIBUTION:
  - INCENTIVES:
  - EVIDENCE:

  ADOPTION, TRACTION & MARKET SENTIMENT:
  - USAGE SIGNALS:
  - MARKET METRICS:
  - PREDICTION MARKET DATA:
  - EVIDENCE:

  RISKS:
  - HIGH:
  - MEDIUM:
  - LOW:

  LIMITATIONS & UNKNOWNS:
  - ...

  DATA SOURCES USED:
  - ...`;
}

export interface ResearchReport {
  project: string;
  report: string;
  sources: SearchResult[];
  timestamp: Date;
}

/**
 * DeepResearcher - Analyzes crypto projects with structured research reports
 * Uses NewsSearcher for data fetching, then applies deep analysis
 */
export class DeepResearcher {
  private newsSearcher = new NewsSearcher();
  private openai = new OpenAI();
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  /**
   * Perform deep research analysis on a crypto project
   * @param project Project name to research
   * @param options Research options
   */
  async analyzeProject(
    project: string,
    options?: {
      language?: "en" | "vi";
    }
  ): Promise<ResearchReport> {
    const { language = "en" } = options || {};

    // Fetch comprehensive data from multiple source categories
    const queries = [
      `${project} cryptocurrency project overview technology`,
      `${project} crypto team founders governance`,
      `${project} tokenomics token distribution supply`,
      `${project} crypto adoption TVL users metrics`,
      `${project} cryptocurrency risks analysis`,
    ];

    const polyPlugin = new PolymarketPlugin();

    let polyData: PolymarketPlugin[] = [];

    try {
      polyData = await polyPlugin.fetchMarkets(project);
    } catch (error) {
      console.log(chalk.gray(` [Polymarket] No data found or API issue.`));
    }

    // Collect data from all queries
    const allResults: SearchResult[] = [];
    
    for (const query of queries) {
      const results = await this.newsSearcher.search(query, {
        limit: 3,
        categories: ["research", "news", "defi", "market"],
        language,
      });
      allResults.push(...results);
    }

    // Deduplicate by URL
    const uniqueResults = allResults.filter(
      (result, index, self) =>
        index === self.findIndex((r) => r.url === result.url)
    );

    if (uniqueResults.length === 0) {
      return {
        project,
        report: `Unable to find sufficient data for research on "${project}". Please try a more specific project name or check if the project exists.`,
        sources: [],
        timestamp: new Date(),
      };
    }

    const polyContext = polyData.length > 0 
    ? `\n[PREDICTION MARKET DATA (POLYMARKET)]:\n` + polyData.map(d => 
        `- Market: ${d.title}\n  Volume: ${d.volume}\n  Odds (Yes): ${(d.price * 100).toFixed(1)}%`
      ).join('\n')
    : "";

    // Prepare source context for analysis
    const sourcesContext = uniqueResults
      .map(
        (d, i) =>
          `[Source ${i + 1}: ${d.source}]\nTitle: ${d.title}\nContent: ${d.content}\nURL: ${d.url}`
      )
      .join("\n\n---\n\n");

    const combinedContext = sourcesContext + "\n\n" + polyContext;

    // Generate deep research report
    const report = await this.generateReport(combinedContext, project, language);

    return {
      project,
      report,
      sources: uniqueResults,
      timestamp: new Date(),
    };
  }

  /**
   * Generate research report using AI
   */
  private async generateReport(
    sourcesContext: string,
    project: string,
    language: "en" | "vi"
  ): Promise<string> {
    const systemPrompt = getDeepResearchPrompt(project);
    const languageNote =
      language === "vi"
        ? "\n\nIMPORTANT: The user speaks Vietnamese. Output the research report in Vietnamese."
        : "";

    const userContent = `Analyze the following sources and produce a structured research report about ${project}:\n\n${sourcesContext}${languageNote}`;

    // Try OpenAI first
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      });

      return completion.choices[0].message.content || "Unable to generate report.";
    } catch {
      console.log("OpenAI unavailable, trying Groq...");

      // Try Groq
      try {
        const groqResponse = await this.groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          temperature: 0.2,
        });

        return groqResponse.choices[0].message.content || "Unable to generate report.";
      } catch {
        console.log("Groq unavailable, trying Gemini...");

        // Try Gemini
        try {
          const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const fullPrompt = `${systemPrompt}\n\n${userContent}`;
          const result = await model.generateContent(fullPrompt);
          return result.response.text();
        } catch {
          throw new Error("All AI models failed to generate the research report.");
        }
      }
    }
  }

  /**
   * Quick project summary (less comprehensive than full analysis)
   */
  async quickSummary(project: string): Promise<string> {
    const results = await this.newsSearcher.search(
      `${project} cryptocurrency overview summary`,
      { limit: 5, categories: ["research", "news"] }
    );

    if (results.length === 0) {
      return `No data found for ${project}.`;
    }

    const rawText = results.map((r) => r.content).join("\n\n");
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Provide a brief, factual summary of ${project} based only on the provided information. No speculation or investment advice.`,
          },
          { role: "user", content: rawText },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      return completion.choices[0].message.content || "Unable to summarize.";
    } catch {
      return `Summary: ${results[0]?.content.slice(0, 500) || "No data available."}`;
    }
  }
}