import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, TrendingUp, Wallet, DollarSign, Gift } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Trade {
  id: string;
  coin_name: string;
  coin_symbol: string;
  trade_type: string;
  quantity: number;
  price_usd: number;
  total_usd: number;
  created_at: string;
  profiles: {
    email: string;
    full_name: string;
  };
}

interface UserWallet {
  id: string;
  user_id: string;
  balance_usd: number;
  profiles: {
    email: string;
    full_name: string;
  };
}

const Admin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [balanceInput, setBalanceInput] = useState<{[key: string]: string}>({});
  const [bonusLoading, setBonusLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchTrades();
      fetchWallets();
    }
  }, [isAdmin]);

  const fetchTrades = async () => {
    try {
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (tradesError) throw tradesError;

      // Fetch user profiles separately
      const userIds = [...new Set(tradesData?.map(t => t.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles' as any)
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Merge trades with profiles
      const tradesWithProfiles = tradesData?.map(trade => ({
        ...trade,
        profiles: profilesData?.find(p => p.id === trade.user_id) || { email: '', full_name: '' }
      })) || [];

      setTrades(tradesWithProfiles as Trade[]);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWallets = async () => {
    try {
      const { data: walletsData, error: walletsError } = await supabase
        .from('wallets' as any)
        .select('*')
        .order('balance_usd', { ascending: false });

      if (walletsError) throw walletsError;

      const userIds = [...new Set(walletsData?.map(w => w.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles' as any)
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const walletsWithProfiles = walletsData?.map(wallet => ({
        ...wallet,
        profiles: profilesData?.find(p => p.id === wallet.user_id) || { email: '', full_name: '' }
      })) || [];

      setWallets(walletsWithProfiles as UserWallet[]);
    } catch (error) {
      console.error('Error fetching wallets:', error);
    } finally {
      setWalletsLoading(false);
    }
  };

  const updateWalletBalance = async (walletId: string, newBalance: string) => {
    try {
      const balance = parseFloat(newBalance);
      if (isNaN(balance) || balance < 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid positive number",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('wallets' as any)
        .update({ balance_usd: balance })
        .eq('id', walletId);

      if (error) throw error;

      toast({
        title: "Balance Updated",
        description: `Wallet balance updated to $${balance.toLocaleString()}`,
      });

      fetchWallets();
      setBalanceInput(prev => ({ ...prev, [walletId]: '' }));
    } catch (error: any) {
      console.error('Error updating wallet:', error);
      toast({
        title: "Update Error",
        description: error.message || "Failed to update wallet balance",
        variant: "destructive",
      });
    }
  };

  const triggerDailyBonus = async () => {
    setBonusLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-bonus');
      
      if (error) throw error;

      toast({
        title: "Daily Bonus Distributed",
        description: `Successfully added $1000 to ${data.walletsUpdated} wallets`,
      });

      fetchWallets();
    } catch (error: any) {
      console.error('Error triggering daily bonus:', error);
      toast({
        title: "Bonus Error",
        description: error.message || "Failed to distribute daily bonus",
        variant: "destructive",
      });
    } finally {
      setBonusLoading(false);
    }
  };

  if (authLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Trading
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Admin Panel
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="trades" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="wallets">Wallets</TabsTrigger>
          </TabsList>

          <TabsContent value="trades">
            <Card className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Recent Trades</h2>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : trades.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Trades Yet</h3>
                  <p className="text-muted-foreground">
                    Trade activity will appear here once users start trading
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {trades.map((trade) => (
                    <Card key={trade.id} className="p-4 bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {trade.profiles?.full_name || trade.profiles?.email || 'Unknown User'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {trade.profiles?.email}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            trade.trade_type === 'buy' ? 'text-success' : 'text-danger'
                          }`}>
                            {trade.trade_type.toUpperCase()} {trade.coin_symbol.toUpperCase()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {trade.quantity} @ ${trade.price_usd.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total: ${trade.total_usd.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(trade.created_at).toLocaleString()}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="wallets">
            <Card className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Wallet className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">User Wallets</h2>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={triggerDailyBonus} 
                    disabled={bonusLoading}
                    variant="default"
                    className="gap-2"
                  >
                    <Gift className="w-4 h-4" />
                    {bonusLoading ? 'Distributing...' : 'Give Daily Bonus ($1000)'}
                  </Button>
                </div>
              </div>

              <Card className="p-4 bg-primary/10 border-primary/20 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Admin Balance Control</p>
                    <p className="font-semibold">Add funds to your own account</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={balanceInput['admin-self'] || ''}
                      onChange={(e) => setBalanceInput(prev => ({ ...prev, 'admin-self': e.target.value }))}
                      className="w-32"
                    />
                    <Button 
                      size="sm"
                      onClick={async () => {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return;
                        
                        const amount = parseFloat(balanceInput['admin-self'] || '0');
                        if (isNaN(amount) || amount <= 0) {
                          toast({
                            title: "Invalid Amount",
                            description: "Please enter a valid positive number",
                            variant: "destructive",
                          });
                          return;
                        }

                        try {
                          const { data: wallet, error: fetchError } = await supabase
                            .from('wallets' as any)
                            .select('balance_usd')
                            .eq('user_id', user.id)
                            .maybeSingle();

                          if (fetchError) throw fetchError;

                          if (!wallet) {
                            // Create wallet if it doesn't exist
                            const { error: createError } = await supabase
                              .from('wallets' as any)
                              .insert({
                                user_id: user.id,
                                balance_usd: amount
                              } as any);

                            if (createError) throw createError;

                            toast({
                              title: "Wallet Created & Balance Added",
                              description: `Added $${amount.toLocaleString()} to your new account`,
                            });
                          } else {
                            const newBalance = ((wallet as any)?.balance_usd || 0) + amount;

                            const { error: updateError } = await supabase
                              .from('wallets' as any)
                              .update({ balance_usd: newBalance } as any)
                              .eq('user_id', user.id);

                            if (updateError) throw updateError;

                            toast({
                              title: "Balance Updated",
                              description: `Added $${amount.toLocaleString()} to your account`,
                            });
                          }

                          fetchWallets();
                          setBalanceInput(prev => ({ ...prev, 'admin-self': '' }));
                        } catch (error: any) {
                          console.error('Error updating balance:', error);
                          toast({
                            title: "Update Error",
                            description: error.message || "Failed to update balance",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Add to My Account
                    </Button>
                  </div>
                </div>
              </Card>

              {walletsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : wallets.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Wallets Found</h3>
                  <p className="text-muted-foreground">
                    User wallets will appear here once users sign up
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {wallets.map((wallet) => (
                    <Card key={wallet.id} className="p-4 bg-secondary/50">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1">
                          <p className="font-semibold">
                            {wallet.profiles?.full_name || wallet.profiles?.email || 'Unknown User'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {wallet.profiles?.email}
                          </p>
                          <p className="text-2xl font-bold text-primary mt-2">
                            ${wallet.balance_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="New balance"
                            value={balanceInput[wallet.id] || ''}
                            onChange={(e) => setBalanceInput(prev => ({ ...prev, [wallet.id]: e.target.value }))}
                            className="w-32"
                          />
                          <Button 
                            size="sm"
                            onClick={() => updateWalletBalance(wallet.id, balanceInput[wallet.id] || '')}
                          >
                            Update
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
