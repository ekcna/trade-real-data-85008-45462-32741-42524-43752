import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';

const fetchCryptoPrice = async (coinId: string) => {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
  );
  if (!response.ok) throw new Error('Failed to fetch price');
  return response.json();
};

const Wallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [walletAddresses, setWalletAddresses] = useState<Record<string, string>>({});

  // Fetch prices with auto-refresh every 30 seconds
  const { data: bitcoinData } = useQuery({
    queryKey: ['crypto-price', 'bitcoin'],
    queryFn: () => fetchCryptoPrice('bitcoin'),
    refetchInterval: 30000,
  });

  const { data: ethereumData } = useQuery({
    queryKey: ['crypto-price', 'ethereum'],
    queryFn: () => fetchCryptoPrice('ethereum'),
    refetchInterval: 30000,
  });

  const { data: solanaData } = useQuery({
    queryKey: ['crypto-price', 'solana'],
    queryFn: () => fetchCryptoPrice('solana'),
    refetchInterval: 30000,
  });

  const { data: tetherData } = useQuery({
    queryKey: ['crypto-price', 'tether'],
    queryFn: () => fetchCryptoPrice('tether'),
    refetchInterval: 30000,
  });

  const cryptoPrices: Record<string, any> = {
    bitcoin: bitcoinData?.bitcoin,
    ethereum: ethereumData?.ethereum,
    solana: solanaData?.solana,
    tether: tetherData?.tether,
  };

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

  const fetchWalletData = async () => {
    try {
      // Fetch wallet balance
      const { data: walletData } = await supabase
        .from('wallets' as any)
        .select('balance_usd')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (walletData) {
        setBalance((walletData as any).balance_usd);
      }

      // Fetch wallet addresses
      const { data: addresses } = await supabase
        .from('wallet_addresses' as any)
        .select('*')
        .eq('user_id', user?.id);

      if (addresses && (addresses as any[]).length > 0) {
        const addressMap: Record<string, string> = {};
        (addresses as any[]).forEach(addr => {
          addressMap[addr.currency] = addr.address;
        });
        setWalletAddresses(addressMap);
      } else {
        // Create addresses if they don't exist
        const currencies = ['bitcoin', 'ethereum', 'solana', 'tether'];
        for (const currency of currencies) {
          const address = await supabase.rpc('generate_crypto_address' as any, { currency });
          if (address.data) {
            await supabase.from('wallet_addresses' as any).insert({
              user_id: user?.id,
              currency,
              address: address.data
            } as any);
          }
        }
        // Refetch after creating
        const { data: newAddresses } = await supabase
          .from('wallet_addresses' as any)
          .select('*')
          .eq('user_id', user?.id);
        
        if (newAddresses) {
          const addressMap: Record<string, string> = {};
          (newAddresses as any[]).forEach(addr => {
            addressMap[addr.currency] = addr.address;
          });
          setWalletAddresses(addressMap);
        }
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyWalletAddress = (currency: string) => {
    const address = walletAddresses[currency];
    if (address) {
      navigator.clipboard.writeText(address);
      toast({
        title: 'Copied!',
        description: `${currency.toUpperCase()} address copied to clipboard`,
      });
    }
  };


  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Balance Card */}
      <Card className="glass-card p-8">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-sm">Total Balance</p>
          <h2 className="text-5xl font-bold">
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>
      </Card>

      {/* Crypto Prices and Wallet Addresses */}
      {Object.keys(walletAddresses).length > 0 && (
        <Card className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Your Wallet Addresses</h3>
          
          <Tabs defaultValue="bitcoin" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="bitcoin">BTC</TabsTrigger>
              <TabsTrigger value="ethereum">ETH</TabsTrigger>
              <TabsTrigger value="solana">SOL</TabsTrigger>
              <TabsTrigger value="tether">USDT</TabsTrigger>
            </TabsList>
            
            {Object.entries(walletAddresses).map(([currency, address]) => {
              const priceData = cryptoPrices[currency];
              const price = priceData?.usd || 0;
              const change = priceData?.usd_24h_change || 0;
              
              return (
                <TabsContent key={currency} value={currency} className="space-y-4">
                  <div className="text-center p-6 bg-secondary/30 rounded-xl">
                    <p className="text-sm text-muted-foreground uppercase font-semibold mb-2">
                      {currency} Price
                    </p>
                    <p className="text-4xl font-bold mb-2">
                      ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className={`flex items-center justify-center gap-1 ${change >= 0 ? 'text-success' : 'text-danger'}`}>
                      {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span className="text-sm font-semibold">
                        {change >= 0 ? '+' : ''}{change.toFixed(2)}% (24h)
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Your {currency.toUpperCase()} Address</p>
                    <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg border border-border">
                      <code className="flex-1 text-sm font-mono break-all">{address}</code>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyWalletAddress(currency)}
                        className="shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </Card>
      )}
    </div>
  );
};

export default Wallet;
