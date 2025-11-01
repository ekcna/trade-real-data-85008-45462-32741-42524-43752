import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, TrendingUp, Zap, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import CoinChart from "@/components/CoinChart";
import TradingPanel from "@/components/TradingPanel";

interface Coin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  image: string;
  sparkline_in_7d?: { price: number[] };
}

interface MarketOverviewProps {
  onCoinSelect?: (coin: Coin) => void;
}

const fetchCryptoData = async (): Promise<Coin[]> => {
  const response = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h"
  );
  if (!response.ok) throw new Error("Failed to fetch crypto data");
  return response.json();
};

const MarketOverviewWithChart = ({ onCoinSelect }: MarketOverviewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  
  const { data: coins, isLoading } = useQuery({
    queryKey: ["cryptoMarket"],
    queryFn: fetchCryptoData,
    refetchInterval: 30000,
  });

  const filteredCoins = coins?.filter(coin => 
    coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topGainers = filteredCoins?.filter(coin => coin.price_change_percentage_24h > 0)
    .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
    .slice(0, 12);

  const altCoins = filteredCoins?.slice(10, 30);

  const handleCoinClick = (coin: Coin) => {
    setSelectedCoin(coin);
    onCoinSelect?.(coin);
  };

  const handleBackToList = () => {
    setSelectedCoin(null);
    onCoinSelect?.(null);
  };

  if (selectedCoin) {
    return (
      <div className="space-y-4">
        <button 
          onClick={handleBackToList}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to market
        </button>
        <CoinChart coinId={selectedCoin.id} coinName={selectedCoin.name} />
        <TradingPanel selectedCoin={selectedCoin} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search cryptocurrencies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 bg-secondary border-none rounded-2xl h-12"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-secondary rounded-2xl p-1">
          <TabsTrigger value="all" className="rounded-xl data-[state=active]:bg-card">
            All Coins
          </TabsTrigger>
          <TabsTrigger value="gainers" className="rounded-xl data-[state=active]:bg-card">
            Gainers
          </TabsTrigger>
          <TabsTrigger value="alts" className="rounded-xl data-[state=active]:bg-card">
            Alt Coins
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <CoinGrid coins={filteredCoins} isLoading={false} onCoinClick={handleCoinClick} />
        </TabsContent>

        <TabsContent value="gainers" className="mt-4">
          <CoinGrid coins={topGainers} isLoading={false} onCoinClick={handleCoinClick} />
        </TabsContent>

        <TabsContent value="alts" className="mt-4">
          <CoinGrid coins={altCoins} isLoading={false} onCoinClick={handleCoinClick} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const CoinGrid = ({ coins, isLoading, onCoinClick }: { 
  coins: Coin[] | undefined; 
  isLoading: boolean; 
  onCoinClick: (coin: Coin) => void;
}) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!coins || coins.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No coins found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {coins.map((coin) => {
        const isPositive = coin.price_change_percentage_24h >= 0;
        
        return (
          <div
            key={coin.id}
            onClick={() => onCoinClick(coin)}
            className="coin-item p-4 flex items-center justify-between bg-card"
          >
            <div className="flex items-center gap-3">
              <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
              <div>
                <p className="font-semibold">{coin.name}</p>
                <p className="text-sm text-muted-foreground uppercase">{coin.symbol}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="font-semibold">
                ${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className={`flex items-center justify-end gap-1 text-sm ${
                isPositive ? 'text-success' : 'text-danger'
              }`}>
                {isPositive ? (
                  <ArrowUpIcon className="w-3 h-3" />
                ) : (
                  <ArrowDownIcon className="w-3 h-3" />
                )}
                <span>{Math.abs(coin.price_change_percentage_24h).toFixed(2)}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MarketOverviewWithChart;
