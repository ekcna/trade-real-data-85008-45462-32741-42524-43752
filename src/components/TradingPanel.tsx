import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TradingPanelProps {
  selectedCoin: any;
}

const TradingPanel = ({ selectedCoin }: TradingPanelProps) => {
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: walletError } = await supabase
        .from('wallets' as any)
        .select('balance_usd')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError || !data) {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets' as any)
          .insert({
            user_id: user.id,
            balance_usd: 10000
          } as any)
          .select()
          .single();

        if (createError) throw createError;
        const currentBalance = (newWallet as any)?.balance_usd || 0;
        setWalletBalance(currentBalance);
      } else {
        const currentBalance = (data as any)?.balance_usd || 0;
        setWalletBalance(currentBalance);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleTrade = async (type: "buy" | "sell") => {
    if (!selectedCoin) {
      toast({
        title: "No Coin Selected",
        description: "Please select a cryptocurrency from the market overview first.",
        variant: "destructive",
      });
      return;
    }

    if (!amount && !quantity) {
      toast({
        title: "Invalid Amount",
        description: "Please enter an amount or quantity to trade.",
        variant: "destructive",
      });
      return;
    }

    const totalValue = amount ? parseFloat(amount) : selectedCoin.current_price * parseFloat(quantity || "0");
    const tradeQuantity = parseFloat(quantity || "0");

    // Check wallet balance for buy orders
    if (type === "buy" && totalValue > walletBalance) {
      toast({
        title: "Insufficient Funds",
        description: `You need $${totalValue.toFixed(2)} but only have $${walletBalance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    // Check holdings for sell orders
    if (type === "sell") {
      const holdings = JSON.parse(localStorage.getItem("portfolio") || "{}");
      const currentHoldings = holdings[selectedCoin.id] || 0;
      
      if (tradeQuantity > currentHoldings) {
        toast({
          title: "Insufficient Holdings",
          description: `You only have ${currentHoldings} ${selectedCoin.symbol.toUpperCase()} but trying to sell ${tradeQuantity}`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      // Save trade to database
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to trade.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from('trades' as any).insert({
        user_id: user.id,
        coin_id: selectedCoin.id,
        coin_symbol: selectedCoin.symbol,
        coin_name: selectedCoin.name,
        trade_type: type,
        quantity: parseFloat(quantity || "0"),
        price_usd: selectedCoin.current_price,
        total_usd: totalValue,
      } as any);

      if (error) throw error;

      // Update wallet balance
      const newBalance = type === "buy" 
        ? walletBalance - totalValue 
        : walletBalance + totalValue;

      const { error: walletError } = await supabase
        .from('wallets' as any)
        .update({ balance_usd: newBalance } as any)
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      setWalletBalance(newBalance);

      // Update local storage for portfolio
      const holdings = JSON.parse(localStorage.getItem("portfolio") || "{}");
      
      if (type === "buy") {
        const currentAmount = holdings[selectedCoin.id] || 0;
        holdings[selectedCoin.id] = currentAmount + parseFloat(quantity || "0");
      } else {
        const currentAmount = holdings[selectedCoin.id] || 0;
        holdings[selectedCoin.id] = Math.max(0, currentAmount - parseFloat(quantity || "0"));
      }
      
      localStorage.setItem("portfolio", JSON.stringify(holdings));

      const action = type === "buy" ? "Bought" : "Sold";
      toast({
        title: `${action} Successfully!`,
        description: `${action} ${quantity || amount} ${selectedCoin?.symbol.toUpperCase()} at $${selectedCoin?.current_price}`,
      });

      setAmount("");
      setQuantity("");
    } catch (error: any) {
      console.error('Error trading:', error);
      toast({
        title: "Trade Error",
        description: error.message || "Failed to execute trade. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!selectedCoin) {
    return (
      <Card className="glass-card p-8 text-center">
        <div className="space-y-4">
          <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground" />
          <h3 className="text-xl font-semibold">No Coin Selected</h3>
          <p className="text-muted-foreground">
            Select a cryptocurrency from the market overview to start trading
          </p>
        </div>
      </Card>
    );
  }

  const totalValue = amount ? parseFloat(amount) : selectedCoin.current_price * parseFloat(quantity || "0");

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="glass-card p-6">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <img src={selectedCoin.image} alt={selectedCoin.name} className="w-12 h-12" />
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{selectedCoin.name}</h2>
            <p className="text-muted-foreground">{selectedCoin.symbol.toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">${selectedCoin.current_price.toLocaleString()}</p>
            <p
              className={`text-sm ${
                selectedCoin.price_change_percentage_24h >= 0 ? "text-success" : "text-danger"
              }`}
            >
              {selectedCoin.price_change_percentage_24h >= 0 ? "+" : ""}
              {selectedCoin.price_change_percentage_24h.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-4 bg-primary/10 rounded-lg mb-6">
          <Wallet className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="text-xl font-bold">
              {loadingWallet ? "..." : `$${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </div>
        </div>

        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="buy" className="data-[state=active]:bg-success/20 data-[state=active]:text-success">
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-danger/20 data-[state=active]:text-danger">
              Sell
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buy-quantity">Quantity</Label>
              <Input
                id="buy-quantity"
                type="number"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setAmount((parseFloat(e.target.value) * selectedCoin.current_price).toFixed(2));
                }}
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buy-amount">Amount (USD)</Label>
              <Input
                id="buy-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setQuantity((parseFloat(e.target.value) / selectedCoin.current_price).toFixed(8));
                }}
                className="bg-secondary"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <span className="text-muted-foreground">Total</span>
              <span className="text-xl font-bold">${totalValue.toFixed(2)}</span>
            </div>

            <Button
              className="w-full bg-success hover:bg-success/90 text-white"
              size="lg"
              onClick={() => handleTrade("buy")}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Buy {selectedCoin.symbol.toUpperCase()}
            </Button>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sell-quantity">Quantity</Label>
              <Input
                id="sell-quantity"
                type="number"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setAmount((parseFloat(e.target.value) * selectedCoin.current_price).toFixed(2));
                }}
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sell-amount">Amount (USD)</Label>
              <Input
                id="sell-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setQuantity((parseFloat(e.target.value) / selectedCoin.current_price).toFixed(8));
                }}
                className="bg-secondary"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <span className="text-muted-foreground">Total</span>
              <span className="text-xl font-bold">${totalValue.toFixed(2)}</span>
            </div>

            <Button
              className="w-full bg-danger hover:bg-danger/90 text-white"
              size="lg"
              onClick={() => handleTrade("sell")}
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Sell {selectedCoin.symbol.toUpperCase()}
            </Button>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default TradingPanel;
