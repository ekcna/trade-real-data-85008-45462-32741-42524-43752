import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Clock } from "lucide-react";

interface CoinChartProps {
  coinId: string;
  coinName: string;
}

const fetchCoinHistory = async (coinId: string) => {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`
  );
  if (!response.ok) throw new Error("Failed to fetch chart data");
  const data = await response.json();
  
  // Transform data for recharts
  return data.prices.map((price: [number, number]) => ({
    time: new Date(price[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: price[1],
  }));
};

const CoinChart = ({ coinId, coinName }: CoinChartProps) => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['coinChart', coinId],
    queryFn: () => fetchCoinHistory(coinId),
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <Card className="glass-card p-6">
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  return (
    <Card className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-bold">{coinName} - 7 Day Chart</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Live Data</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default CoinChart;
