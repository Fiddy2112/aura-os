import axios from "axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PolymarketMarket {
  title:     string;
  volume:    string;
  liquidity: string;
  price:     number;
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export class PolymarketPlugin {
  private baseUrl = 'https://gamma-api.polymarket.com';

  async fetchMarkets(query: string): Promise<PolymarketMarket[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/events`, {
        params: { limit: 3, closed: false, search: query },
        timeout: 5000,
      });

      return response.data.map((event: any): PolymarketMarket => {
        const market = event.markets?.[0];
        const fmt = (n: number) =>
          new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

        return {
          title:     event.title,
          volume:    fmt(event.volume   ?? 0),
          liquidity: fmt(event.liquidity ?? 0),
          price:     market?.outcomePrices?.[0] ?? 0,
        };
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[Polymarket] fetchMarkets failed: ${msg}`);
      return [];
    }
  }
}