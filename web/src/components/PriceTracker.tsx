import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface PriceData {
  eth: number;
  sui: number;
  ethChange: number;
  suiChange: number;
}

export default function PriceTracker() {
  const [prices, setPrices] = useState<PriceData>({ 
    eth: 0, 
    sui: 0,
    ethChange: 2.4,
    suiChange: -1.2
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT
        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbols=["ETHUSDT","SUIUSDT"]');
        const data = await res.json();
        setPrices(prev => ({
          eth: parseFloat(data.find((t: any) => t.symbol === 'ETHUSDT')?.price || '0'),
          sui: parseFloat(data.find((t: any) => t.symbol === 'SUIUSDT')?.price || '0'),
          ethChange: prev.ethChange,
          suiChange: prev.suiChange
        }));
        setLoading(false);
      } catch (e) { 
        console.error("Failed to fetch prices");
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-wrap gap-4 justify-center">
      {/* ETH Price Card */}
      <div className="glass-card px-6 py-4 flex items-center gap-4 min-w-[180px]">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl border border-zinc-700">
          <img src="/ethereum.svg" alt="ETH" className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">ETH</p>
          <div className="flex items-center gap-2">
            {loading ? (
              <RefreshCw className="w-4 h-4 text-zinc-600 animate-spin" />
            ) : (
              <>
                <span className="text-lg font-semibold text-white font-mono">
                  ${prices.eth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-xs flex items-center gap-0.5 ${prices.ethChange >= 0 ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {prices.ethChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(prices.ethChange)}%
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SUI Price Card */}
      <div className="glass-card px-6 py-4 flex items-center gap-4 min-w-[180px]">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl border border-zinc-700">
          <img src="/sui.svg" alt="SUI" className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">SUI</p>
          <div className="flex items-center gap-2">
            {loading ? (
              <RefreshCw className="w-4 h-4 text-zinc-600 animate-spin" />
            ) : (
              <>
                <span className="text-lg font-semibold text-white font-mono">
                  ${prices.sui.toFixed(4)}
                </span>
                <span className={`text-xs flex items-center gap-0.5 ${prices.suiChange >= 0 ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {prices.suiChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(prices.suiChange)}%
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}