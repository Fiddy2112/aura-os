import OpenAI from "openai";
import chalk from "chalk";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';

export class SocialAgent{
    private openai = new OpenAI();
    private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

    async generateThread(topic:string, researchContent:string):Promise<string[]>{
        console.log(chalk.magenta(`\n Aura Social: Crafting viral thread for "${topic}"...`));

        const prompt = `
        You are a viral crypto content creator (Twitter/X expert).
        Take the following research report and convert it into a highly engaging Twitter Thread (6-10 tweets).
        
        OBJECTIVE: Turn this technical report into "Alpha" that people feel compelled to bookmark.
        
        RULES:
        - Tone: Insightful, Degen-friendly, but confident and professional.
        - Hook: First tweet must be a powerful hook (e.g., "Why $TOKEN is undervalued..." or "Everyone is missing this...").
        - Structure: Use short paragraphs. Use bullet points (•) for lists.
        - Formatting: Separate EVERY tweet with strictly TWO newlines (\n\n). Do not number them like "Tweet 1:". Just the content.
        - Content: Focus on numbers, unique mechanics, and "why this matters".
        - Ending: Last tweet must be a summary + CTA (RT/Like).
        - Hashtags: Use #${topic} #Crypto #RealYield. (Only at the end of tweets).
        
        RESEARCH CONTENT:
        ${researchContent.slice(0, 3500)}
        `;
        
        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: prompt }],
                temperature: 0.7,
            });

            const rawContent = completion.choices[0].message.content || "";
            return rawContent.split('\n\n').filter(t => t.length > 10);
        } catch (error) {
            console.log(chalk.yellow(" ⚠ OpenAI failed, switching to Groq..."));
            try {
                const groqResponse = await this.groq.chat.completions.create({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "system", content: prompt }],
                    temperature: 0.7,
                });
                
                const rawContent = groqResponse.choices[0].message.content || "";
                return rawContent.split('\n\n').filter(t => t.length > 10);
            } catch (groqError) {
                console.log(chalk.yellow(" ⚠ Groq failed, switching to Gemini..."));
                try {
                    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                    const result = await model.generateContent(prompt);
                    const rawContent = result.response.text();
                    return rawContent.split('\n\n').filter(t => t.length > 10);
                } catch (geminiError) {
                    console.error(chalk.red(" ❌ All AI models failed to generate thread."));
                    return ["Error: Could not generate thread."];
                }
            }
        }
    }
}