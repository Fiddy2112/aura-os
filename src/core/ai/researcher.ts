import OpenAI from "openai";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NewsSearcher, type SearchResult } from "./news.js";
import { PolymarketPlugin, type PolymarketMarket } from "./plugins/polymarket.js";
import chalk from "chalk";

// ── Deep Research Prompt ──────────────────────────────────────────────────────

function getDeepResearchPrompt(project: string): string {
  return `You are a professional crypto research analyst and sentiment expert.

  Your task is to produce a structured, evidence-driven research report about ${project}.
  This is analytical research — NOT news summarization and NOT investment advice.

  STRICT BOUNDARIES:
  - Use ONLY information from the provided sources and [PREDICTION MARKET DATA].
  - If Polymarket data is available, use it to contextualize market sentiment.
  - Do NOT rely on prior knowledge or assumptions.
  - If evidence is missing, state: "insufficient data".
  - If sources conflict, cite both: "Source 1 claims X, Source 2 indicates Y".

  MANDATORY PRINCIPLES:
  - Every factual claim MUST have an inline citation: e.g., "Launched Q1 [Source 1]."
  - Distinguish FACTS / CLAIMED PURPOSE / INTERPRETATIONS.
  - Market data MUST include a timestamp or reference date.

  OUTPUT FORMAT (STRICT):

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

// ─────────────────────────────────────────────────────────────────────────────

export interface ResearchReport {
  project:   string;
  report:    string;
  sources:   SearchResult[];
  timestamp: Date;
}

export class DeepResearcher {
  private newsSearcher = new NewsSearcher();

  // Lazy-init AI clients — only instantiate if keys are present
  private get openai() {
    return process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;
  }
  private get groq() {
    return process.env.GROQ_API_KEY
      ? new Groq({ apiKey: process.env.GROQ_API_KEY })
      : null;
  }
  private get genAI() {
    return process.env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null;
  }

  async analyzeProject(
    project: string,
    options?: { language?: 'en' | 'vi' }
  ): Promise<ResearchReport> {
    const { language = 'en' } = options ?? {};

    const queries = [
      `${project} cryptocurrency project overview technology`,
      `${project} crypto team founders governance`,
      `${project} tokenomics token distribution supply`,
      `${project} crypto adoption TVL users metrics`,
      `${project} cryptocurrency risks analysis`,
    ];

    // Fetch Polymarket data (best-effort)
    let polyData: PolymarketMarket[] = [];
    try {
      const plugin = new PolymarketPlugin();
      polyData = await plugin.fetchMarkets(project);
    } catch {
      console.log(chalk.gray(' [Polymarket] No data found.'));
    }

    // Fetch news from all queries
    const allResults: SearchResult[] = [];
    for (const query of queries) {
      const results = await this.newsSearcher.search(query, {
        limit: 3,
        categories: ['research', 'news', 'defi', 'market'],
        language,
      });
      allResults.push(...results);
    }

    // Deduplicate by URL
    const uniqueResults = allResults.filter(
      (r, i, self) => i === self.findIndex(x => x.url === r.url)
    );

    if (uniqueResults.length === 0) {
      return {
        project,
        report: `Unable to find sufficient data for "${project}". Try a more specific name.`,
        sources: [],
        timestamp: new Date(),
      };
    }

    const polyContext = polyData.length > 0
      ? `\n[PREDICTION MARKET DATA (POLYMARKET)]:\n` +
        polyData.map((d: any) =>
          `- Market: ${d.title}\n  Volume: ${d.volume}\n  Odds (Yes): ${(d.price * 100).toFixed(1)}%`
        ).join('\n')
      : '';

    const sourcesContext = uniqueResults
      .map((d, i) =>
        `[Source ${i + 1}: ${d.source}]\nTitle: ${d.title}\nContent: ${d.content}\nURL: ${d.url}`
      )
      .join('\n\n---\n\n');

    const report = await this.generateReport(
      sourcesContext + '\n\n' + polyContext,
      project,
      language,
    );

    return { project, report, sources: uniqueResults, timestamp: new Date() };
  }

  private async generateReport(
    sourcesContext: string,
    project: string,
    language: 'en' | 'vi',
  ): Promise<string> {
    const system = getDeepResearchPrompt(project);
    const langNote = language === 'vi'
      ? '\n\nIMPORTANT: Output the report in Vietnamese.'
      : '';
    const user = `Analyze these sources and produce a structured research report about ${project}:\n\n${sourcesContext}${langNote}`;

    const openai = this.openai;
    const groq   = this.groq;
    const genAI  = this.genAI;

    if (openai) {
      try {
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          temperature: 0.2,
          max_tokens: 4000,
        });
        const text = res.choices[0].message.content;
        if (text) return text;
      } catch {
        console.log(chalk.gray(' OpenAI unavailable, trying Groq...'));
      }
    }

    if (groq) {
      try {
        const res = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          temperature: 0.2,
        });
        const text = res.choices[0].message.content;
        if (text) return text;
      } catch {
        console.log(chalk.gray(' Groq unavailable, trying Gemini...'));
      }
    }

    if (genAI) {
      try {
        const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(`${system}\n\n${user}`);
        return result.response.text();
      } catch {}
    }

    throw new Error('All AI models failed to generate the research report.');
  }

  async quickSummary(project: string): Promise<string> {
    const results = await this.newsSearcher.search(
      `${project} cryptocurrency overview summary`,
      { limit: 5, categories: ['research', 'news'] },
    );

    if (results.length === 0) return `No data found for ${project}.`;

    const rawText = results.map(r => r.content).join('\n\n');
    const openai  = this.openai;

    if (openai) {
      try {
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `Provide a brief, factual summary of ${project} based only on the provided information. No speculation or investment advice.` },
            { role: 'user',   content: rawText },
          ],
          temperature: 0.3,
          max_tokens: 500,
        });
        return res.choices[0].message.content || 'Unable to summarize.';
      } catch {}
    }

    return `Summary: ${results[0]?.content.slice(0, 500) ?? 'No data available.'}`;
  }
}