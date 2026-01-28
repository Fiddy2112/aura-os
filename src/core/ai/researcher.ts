import { tavily } from "@tavily/core";
import dotenv from "dotenv";
dotenv.config();

export class CryptoResearcher {
    private tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

    async research(query:string = "latest crypto market news alpha"){
        const searchResponse = await this.tvly.search(query,{
            max_depth: 3,
            searchDepth: "advanced",
            limit: 5,
            includeDomains: ["messari.io", "theblock.co", "coindesk.com", "cointelegraph.com", "mirror.xyz","coingecko.com","coinmarketcap.com", "cryptoslate.com", "coincodex.com", "5phutcrypto.io", "coin98.net"],
        })

        const results = searchResponse.results.map((item,i)=>({
            id:i+1,
            title:item.title,
            url:item.url,
            content:item.content
        }));

        return results;
    }
}