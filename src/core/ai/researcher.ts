import OpenAI from "openai";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NewsSearcher, type SearchResult } from "./news.js";

/**
 * Deep Research Prompt for structured project analysis
 */
function getDeepResearchPrompt(project: string): string {
  return `You are a crypto research analyst.

  Your task is to produce a structured, evidence-driven research report about ${project}.
  This task is analytical research, NOT news summarization and NOT investment advice.

  ========================
  STRICT BOUNDARIES
  ========================
  - Use ONLY information explicitly present in the provided sources.
  - Do NOT rely on prior knowledge, common crypto narratives, or assumptions.
  - If evidence is missing or unclear, explicitly state: "insufficient data".
  - Do NOT infer intent, future outcomes, or motivations beyond what sources state.

  ========================
  AUDIENCE
  ========================
  - The reader understands basic crypto concepts.
  - Use precise, neutral, and analytical language.
  - Avoid marketing, hype, or opinionated phrasing.

  ========================
  MANDATORY RESEARCH PRINCIPLES
  ========================
  - Every factual claim MUST be supported by at least one source.
  - If a claim cannot be fully supported, label it as "unsupported".
  - Clearly distinguish between:
    - FACTS (directly stated or observable)
    - CLAIMED PURPOSE (what the project says about itself)
    - INTERPRETATIONS (explicitly marked and evidence-based)
  - Avoid vague qualifiers such as "strong", "significant", or "robust" unless quantified.
  - Market data MUST include a timestamp or reference date.
    - If the date is missing, state: "date not specified".

  ========================
  RESEARCH FLOW (FOLLOW STRICTLY)
  ========================

  1. PROJECT DEFINITION
  - FACTS:
    - What is the project?
    - When was it created? (if available)
  - CLAIMED PURPOSE:
    - What problem does the project claim to solve?
  - CATEGORY:
    - How the project is described or labeled by the sources
      (e.g., meme coin, L1, L2, DeFi protocol).

  2. TECHNOLOGY & PRODUCT
  - IMPLEMENTATION:
    - What components are actually implemented and live?
    - What parts are inherited from other chains, protocols, or frameworks?
  - MATURITY:
    - idea / testnet / mainnet / production (state evidence).
  - TECHNICAL TRADE-OFFS:
    - What design choices introduce constraints or limitations?
  - EVIDENCE:
    - Repositories, deployments, audits, releases, or technical documentation.

  3. TEAM, GOVERNANCE & CONTROL
  - FACTS:
    - Who controls development, upgrades, or key decisions?
  - GOVERNANCE MECHANISM:
    - DAO, multisig, foundation, company, or informal process.
  - CENTRALIZATION POINTS:
    - Who has final authority or override power?
  - EVIDENCE:
    - Governance documents, public statements, or on-chain control.

  4. TOKEN MODEL & ECONOMICS (IF APPLICABLE)
  - TOKEN ROLE:
    - Is the token required for core protocol functionality?
      (Yes / No / Partially)
  - SUPPLY & DISTRIBUTION:
    - Total supply, circulating supply, emission or unlocks (if available).
  - INCENTIVES:
    - Who benefits from token usage?
    - Who bears economic risk?
  - EVIDENCE:
    - Token documentation, on-chain data, or official disclosures.
  - If no token exists, explicitly state this.

  5. ADOPTION, TRACTION & MARKET METRICS
  - USAGE SIGNALS:
    - Evidence of real usage (on-chain activity, protocol usage).
  - MARKET METRICS:
    - Market Capitalization (with date).
    - Fully Diluted Valuation (FDV), if available (with date).
    - 24h Trading Volume, if available (with date).
  - SPECULATIVE SIGNALS:
    - Exchange listings or trading-related signals (label clearly).
  - DISTINCTION:
    - Clearly separate organic usage from incentive-driven or speculative activity.
  - EVIDENCE:
    - Dashboards, analytics platforms, or cited metrics.

  ⚠ Do NOT include price commentary unless explicitly required to contextualize market metrics.
  ⚠ Do NOT describe price movement, trends, or predictions.

  6. RISK ANALYSIS
  - HIGH RISK:
    - Risks that could materially affect the project’s functionality,
      governance, or economic model.
  - MEDIUM RISK:
    - Risks with moderate impact or likelihood.
  - LOW RISK:
    - Minor or mitigated risks.
  - For EACH risk:
    - Explain WHY it matters.
    - Cite WHAT evidence supports it.
  - Avoid generic market risks (e.g., price volatility) unless directly tied
    to the project’s design.

  7. LIMITATIONS & UNKNOWNS
  - Missing or unavailable data.
  - Unverified or weakly supported claims.
  - Conflicting information across sources.

  ========================
  RULES
  ========================
  - Do NOT speculate beyond the evidence.
  - Do NOT predict price, adoption, or future success.
  - Do NOT provide investment advice or recommendations.
  - Maintain a neutral, analytical, research-only tone.

  ========================
  OUTPUT FORMAT (STRICT)
  ========================

  PROJECT OVERVIEW:
  - FACTS:
  - CLAIMED PURPOSE:
  - CATEGORY:

  TECHNOLOGY & PRODUCT:
  - IMPLEMENTATION:
  - MATURITY:
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

  ADOPTION, TRACTION & MARKET METRICS:
  - USAGE SIGNALS:
  - MARKET METRICS:
  - SPECULATIVE SIGNALS:
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

    // Prepare source context for analysis
    const sourcesContext = uniqueResults
      .map(
        (d, i) =>
          `[Source ${i + 1}: ${d.source}]\nTitle: ${d.title}\nContent: ${d.content}\nURL: ${d.url}`
      )
      .join("\n\n---\n\n");

    // Generate deep research report
    const report = await this.generateReport(sourcesContext, project, language);

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