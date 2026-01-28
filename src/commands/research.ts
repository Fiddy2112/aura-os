import chalk from "chalk";
import { CryptoResearcher } from "../core/ai/researcher.js";
import { AIInterpreter } from "../core/ai/interpreter.js";
import { syncActivity } from "../core/utils/supabase.js";

export async function researchCommand(topic?:string){
    const researcher = new CryptoResearcher();
    const interpreter = new AIInterpreter();
    
    const query = topic || 'Tóm tắt thị trường crypto hôm nay và các xu hướng mới' || "Crypto Market Summary Today and New Trends";
    console.log(chalk.blue(`Aura đang re-research: "${query}"...`));

    const data = await researcher.research(query);
    
    // Summary
    const rawText = data.map(d => d.content).join("\n");
    const summary = await interpreter.summarize(rawText);

    await syncActivity('RESEARCH', { topic }, summary);

    console.log(chalk.cyan.bold('\n--- CRYPTO RE-RESEARCH NEWSLETTER ---'));
    console.log(chalk.white(summary));

    console.log(chalk.gray('\n TRUSTED SOURCES:'));
    data.forEach(d => {
      console.log(chalk.gray(`[${d.id}] ${d.title} - ${d.url}`));
    });
}
