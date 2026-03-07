import OpenAI from "openai";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import chalk from "chalk";

export class SocialAgent {
  // Lazy getters — only instantiate when actually needed
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

  async generateThread(topic: string, researchContent: string): Promise<string[]> {
    console.log(chalk.magenta(`\n Aura Social: Crafting viral thread for "${topic}"...`));

    const prompt = `
    You are a viral crypto content creator (Twitter/X expert).
    Take the following research report and convert it into a highly engaging Twitter Thread (6-10 tweets).

    OBJECTIVE: Turn this technical report into "Alpha" that people feel compelled to bookmark.

    RULES:
    - Tone: Insightful, Degen-friendly, but confident and professional.
    - Hook: First tweet must be a powerful hook (e.g., "Why $TOKEN is undervalued..." or "Everyone is missing this...").
    - Structure: Use short paragraphs. Use bullet points (•) for lists.
    - Formatting: Separate EVERY tweet with strictly TWO newlines (\\n\\n). Do not number them.
    - Content: Focus on numbers, unique mechanics, and "why this matters".
    - Ending: Last tweet must be a summary + CTA (RT/Like).
    - Hashtags: Use #${topic} #Crypto #RealYield (only at the end of tweets).

    RESEARCH CONTENT:
${researchContent.slice(0, 3500)}
    `.trim();

    const splitTweets = (raw: string): string[] =>
      raw.split('\n\n').map(t => t.trim()).filter(t => t.length > 10);

    const openai = this.openai;
    const groq   = this.groq;
    const genAI  = this.genAI;

    if (openai) {
      try {
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.7,
        });
        const text = res.choices[0].message.content;
        if (text) return splitTweets(text);
      } catch {
        console.log(chalk.yellow(' OpenAI failed, switching to Groq...'));
      }
    }

    if (groq) {
      try {
        const res = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.7,
        });
        const text = res.choices[0].message.content;
        if (text) return splitTweets(text);
      } catch {
        console.log(chalk.yellow(' Groq failed, switching to Gemini...'));
      }
    }

    if (genAI) {
      try {
        const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        return splitTweets(result.response.text());
      } catch {}
    }

    console.error(chalk.red(' ❌ All AI models failed to generate thread.'));
    return ['Error: Could not generate thread. Check your API keys.'];
  }
}