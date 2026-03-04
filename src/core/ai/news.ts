import { tavily } from "@tavily/core";


// Trusted crypto news sources by category
const CRYPTO_SOURCES = {
  // Major News Sites
  news: [
    "coindesk.com",
    "cointelegraph.com",
    "theblock.co",
    "decrypt.co",
    "bitcoinmagazine.com",
  ],
  // Research & Analytics
  research: [
    "messari.io",
    "delphi-digital.com",
    "theblockresearch.com",
    "nansen.ai",
    "glassnode.com",
  ],
  // Market Data
  market: [
    "coingecko.com",
    "coinmarketcap.com",
    "tradingview.com",
    "cryptoquant.com",
  ],
  // DeFi & Web3
  defi: [
    "defillama.com",
    "dune.com",
    "mirror.xyz",
    "paragraph.xyz",
  ],
  // Vietnamese Sources
  vietnamese: [
    "coin98.net",
    "5phutcrypto.io",
    "blogtienao.com",
    "tapchibitcoin.io",
    "vn.cointelegraph.com",
    "coin68.com",
    "marginatm.com"
  ],
  // X/Twitter Aggregators (for alpha)
  alpha: [
    "cryptoslate.com",
    "coincodex.com",
    "blockworks.co",
    "thedefiant.io",
  ],
};

// Get all sources as flat array
const getAllSources = (): string[] => {
  return Object.values(CRYPTO_SOURCES).flat();
};

// Get sources by categories
const getSourcesByCategories = (categories: string[]): string[] => {
  const sources: string[] = [];
  for (const cat of categories) {
    if (CRYPTO_SOURCES[cat as keyof typeof CRYPTO_SOURCES]) {
      sources.push(...CRYPTO_SOURCES[cat as keyof typeof CRYPTO_SOURCES]);
    }
  }
  return sources.length > 0 ? sources : getAllSources();
};

export interface SearchResult {
  id: number;
  title: string;
  url: string;
  content: string;
  source?: string;
}

/**
 * NewsSearcher - Fetches news and data from crypto sources via Tavily
 * Used by both news command (quick summaries) and research command (deep analysis)
 */
export class NewsSearcher {
  private tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

  /**
   * Search crypto topics using Tavily
   * @param query Search query
   * @param options Search options
   */
  async search(
    query: string = "latest crypto market news and alpha",
    options?: {
      limit?: number;
      categories?: string[];
      language?: "en" | "vi";
    }
  ): Promise<SearchResult[]> {
    const { limit = 5, categories, language = "en" } = options || {};

    // Determine which sources to use
    const includeDomains = categories
      ? getSourcesByCategories(categories)
      : getAllSources();

    // Add language context to query
    const enhancedQuery =
      language === "vi"
        ? `${query} cryptocurrency blockchain`
        : query;

    try {
      const searchResponse = await this.tvly.search(enhancedQuery, {
        searchDepth: "advanced",
        maxResults: limit,
        includeDomains: includeDomains.slice(0, 20), // Tavily limit
      });

      const results: SearchResult[] = searchResponse.results.map(
        (item, i) => ({
          id: i + 1,
          title: item.title || "Untitled",
          url: item.url,
          content: item.content || "",
          source: this.extractDomain(item.url),
        })
      );

      return results;
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  }

  /**
   * Search for specific token/project news
   */
  async searchToken(token: string): Promise<SearchResult[]> {
    return this.search(`${token} cryptocurrency news analysis`, {
      limit: 5,
      categories: ["news", "research", "market"],
    });
  }

  /**
   * Search DeFi/Protocol news
   */
  async searchDeFi(protocol?: string): Promise<SearchResult[]> {
    const query = protocol
      ? `${protocol} DeFi protocol news updates`
      : "DeFi news TVL yield farming latest";
    return this.search(query, {
      limit: 5,
      categories: ["defi", "research"],
    });
  }

  /**
   * Get market overview
   */
  async searchMarket(): Promise<SearchResult[]> {
    return this.search("crypto market overview bitcoin ethereum analysis today", {
      limit: 5,
      categories: ["news", "market", "research"],
    });
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      return domain;
    } catch {
      return "unknown";
    }
  }
}

// Keep backward compatibility - export old name as alias
export { NewsSearcher as CryptoResearcher };
export type { SearchResult as ResearchResult };
