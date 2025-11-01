import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, TrendingUp, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

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
  onCoinSelect: (coin: Coin) => void;
}

const fetchCryptoData = async (): Promise<Coin[]> => {
  const response = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h"
  );
  if (!response.ok) throw new Error("Failed to fetch crypto data");
  return response.json();
};

const MarketOverview = ({ onCoinSelect }: MarketOverviewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  
  const { data: coins, isLoading } = useQuery({
    queryKey: ["cryptoMarket"],
    queryFn: fetchCryptoData,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const filteredCoins = coins?.filter(coin => 
    coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topGainers = filteredCoins?.filter(coin => coin.price_change_percentage_24h > 0)
    .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
    .slice(0, 12);

  const altCoins = filteredCoins?.filter(coin => 
    !['bitcoin', 'ethereum', 'tether', 'binancecoin', 'usd-coin'].includes(coin.id)
  );

  const getCoinsForTab = () => {
    switch(selectedTab) {
      case 'gainers': return topGainers;
      case 'altcoins': return altCoins;
      default: return filteredCoins;
    }
  };

  const handleCoinClick = (coin: Coin) => {
    onCoinSelect(coin);
    // Scroll to trading panel
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="glass-card p-6">
            <Skeleton className="h-24 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Cryptocurrency Market</h2>
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search coins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary"
          />
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6">
          <TabsTrigger value="all">All Coins</TabsTrigger>
          <TabsTrigger value="gainers">
            <Zap className="w-4 h-4 mr-1" />
            Top Gainers
          </TabsTrigger>
          <TabsTrigger value="altcoins">Alt Coins</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <CoinGrid coins={getCoinsForTab()} onCoinClick={handleCoinClick} />
        </TabsContent>

        <TabsContent value="gainers">
          <CoinGrid coins={getCoinsForTab()} onCoinClick={handleCoinClick} />
        </TabsContent>

        <TabsContent value="altcoins">
          <CoinGrid coins={getCoinsForTab()} onCoinClick={handleCoinClick} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const CoinGrid = ({ coins, onCoinClick }: { coins: Coin[] | undefined, onCoinClick: (coin: Coin) => void }) => {
  if (!coins || coins.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No coins found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {coins.map((coin) => {
          const isPositive = coin.price_change_percentage_24h >= 0;
          
        return (
          <Card
            key={coin.id}
            className="glass-card p-6 cursor-pointer hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
            onClick={() => onCoinClick(coin)}
          >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img src={coin.image} alt={coin.name} className="w-10 h-10" />
                  <div>
                    <h3 className="font-bold text-lg">{coin.symbol.toUpperCase()}</h3>
                    <p className="text-sm text-muted-foreground">{coin.name}</p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                    isPositive ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                  }`}
                >
                  {isPositive ? (
                    <ArrowUpIcon className="w-4 h-4" />
                  ) : (
                    <ArrowDownIcon className="w-4 h-4" />
                  )}
                  <span className="text-sm font-semibold">
                    {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <p className="text-2xl font-bold">
                    ${coin.current_price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Market Cap: ${(coin.market_cap / 1e9).toFixed(2)}B
                  </p>
                </div>
                
                {coin.sparkline_in_7d && (
                  <div className="h-12 relative">
                    <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                      <polyline
                        points={coin.sparkline_in_7d.price
                          .map((price, i) => `${(i / coin.sparkline_in_7d.price.length) * 100},${30 - (price / Math.max(...coin.sparkline_in_7d.price)) * 30}`)
                          .join(" ")}
                        fill="none"
                        stroke={isPositive ? "hsl(var(--success))" : "hsl(var(--danger))"}
                        strokeWidth="2"
                        className="drop-shadow-lg"
                      />
                    </svg>
                  </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default MarketOverview;
