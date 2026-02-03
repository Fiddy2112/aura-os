import axios from "axios";

export interface PolymarketPlugin {
    title:string;
    volume:string;
    liquidity:string;
    price:number;
}

export class PolymarketPlugin {
    private baseUrl = 'https://gamma-api.polymarket.com';

    async fetchMarkets(query:string):Promise<PolymarketPlugin[]>{
        try{
            const response = await axios.get(`${this.baseUrl}/events`, {
                params: {
                limit: 3,
                closed: false,
                search: query
                }
            });

            return response.data.map((event: any) => {
                const market = event.markets?.[0];
                return {
                title: event.title,
                volume: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(event.volume || 0),
                liquidity: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(event.liquidity || 0),
                price: market?.outcomePrices?.[0] || 0
                };
            });
        }catch(error){
            console.error('Error fetching markets:', error);
            return [];
        }
    }
}