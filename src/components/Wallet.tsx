import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, TrendingUp, TrendingDown, Send, Download, QrCode, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QRCodeSVG } from 'qrcode.react';
import { formatLargeNumber } from '@/lib/utils';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendingCurrency, setSendingCurrency] = useState('bitcoin');
  const [receivingCurrency, setReceivingCurrency] = useState('bitcoin');
  const [sendLoading, setSendLoading] = useState(false);
  const [holdings, setHoldings] = useState<Record<string, number>>({});
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

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
      fetchHoldings();
    }
  }, [user]);

  const fetchHoldings = async () => {
    try {
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user?.id);

      if (trades) {
        const holdingsMap: Record<string, number> = {};
        trades.forEach(trade => {
          const coinId = trade.coin_id;
          const quantity = parseFloat(trade.quantity.toString());
          
          if (trade.trade_type === 'buy') {
            holdingsMap[coinId] = (holdingsMap[coinId] || 0) + quantity;
          } else if (trade.trade_type === 'sell') {
            holdingsMap[coinId] = (holdingsMap[coinId] || 0) - quantity;
          }
        });
        setHoldings(holdingsMap);
      }
    } catch (error) {
      console.error('Error fetching holdings:', error);
    }
  };

  const fetchWalletData = async () => {
    try {
      // Fetch wallet balance
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance_usd')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (walletData) {
        setBalance(walletData.balance_usd);
      }

      // Fetch wallet addresses
      const { data: addresses } = await supabase
        .from('wallet_addresses')
        .select('*')
        .eq('user_id', user?.id);

      if (addresses && addresses.length > 0) {
        const addressMap: Record<string, string> = {};
        addresses.forEach(addr => {
          addressMap[addr.currency] = addr.address;
        });
        setWalletAddresses(addressMap);
      } else {
        // Create addresses if they don't exist
        const currencies = ['bitcoin', 'ethereum', 'solana', 'tether'];
        for (const currency of currencies) {
          const address = await supabase.rpc('generate_crypto_address', { currency });
          if (address.data) {
            await supabase.from('wallet_addresses').insert({
              user_id: user?.id,
              currency,
              address: address.data
            });
          }
        }
        // Refetch after creating
        const { data: newAddresses } = await supabase
          .from('wallet_addresses')
          .select('*')
          .eq('user_id', user?.id);
        
        if (newAddresses) {
          const addressMap: Record<string, string> = {};
          newAddresses.forEach(addr => {
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

  const startQrScanner = async () => {
    setShowQrScanner(true);
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      qrScannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          setSendAddress(decodedText);
          stopQrScanner();
          toast({
            title: 'QR Code Scanned!',
            description: 'Address has been filled in',
          });
        },
        (errorMessage) => {
          // Handle scan error silently
        }
      );
    } catch (err) {
      console.error("Error starting QR scanner:", err);
      toast({
        title: 'Camera Access Denied',
        description: 'Please allow camera access to scan QR codes',
        variant: 'destructive',
      });
      setShowQrScanner(false);
    }
  };

  const stopQrScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setShowQrScanner(false);
  };

  const handleSend = async () => {
    if (!sendAddress || !sendAmount) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both address and amount',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive amount',
        variant: 'destructive',
      });
      return;
    }

    // Validate address format based on currency
    const addressValidation = {
      bitcoin: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/,
      ethereum: /^0x[a-fA-F0-9]{40}$/,
      solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
      tether: /^0x[a-fA-F0-9]{40}$/,
    };

    if (!addressValidation[sendingCurrency as keyof typeof addressValidation].test(sendAddress)) {
      toast({
        title: 'Invalid Address',
        description: `Please enter a valid ${sendingCurrency.toUpperCase()} address`,
        variant: 'destructive',
      });
      return;
    }

    // Check if user has enough balance (convert crypto to USD)
    const cryptoPrices: Record<string, any> = {
      bitcoin: bitcoinData?.bitcoin,
      ethereum: ethereumData?.ethereum,
      solana: solanaData?.solana,
      tether: tetherData?.tether,
    };

    const cryptoPrice = cryptoPrices[sendingCurrency]?.usd || 0;
    const totalUSD = amount * cryptoPrice;

    if (totalUSD > balance) {
      toast({
        title: 'Insufficient Balance',
        description: `You need $${totalUSD.toFixed(2)} but only have $${balance.toFixed(2)}`,
        variant: 'destructive',
      });
      return;
    }

    setSendLoading(true);
    try {
      // Deduct from wallet balance
      const newBalance = balance - totalUSD;
      
      const { error } = await supabase
        .from('wallets')
        .update({ balance_usd: newBalance })
        .eq('user_id', user?.id);

      if (error) throw error;

      setBalance(newBalance);
      setSendSuccess(true);

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: 'Transfer Successful!',
        description: `Sent ${amount} ${sendingCurrency.toUpperCase()} to ${sendAddress.substring(0, 10)}...`,
      });

      setSendDialogOpen(false);
      setSendAddress('');
      setSendAmount('');
      setSendSuccess(false);
    } catch (error: any) {
      console.error('Error sending crypto:', error);
      toast({
        title: 'Transfer Failed',
        description: error.message || 'Failed to send crypto',
        variant: 'destructive',
      });
    } finally {
      setSendLoading(false);
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
            ${formatLargeNumber(balance)}
          </h2>
        </div>
      </Card>

      {/* Holdings Card */}
      {Object.keys(holdings).length > 0 && (
        <Card className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Your Holdings</h3>
          <div className="space-y-3">
            {Object.entries(holdings).map(([coinId, quantity]) => {
              if (quantity <= 0) return null;
              const priceData = cryptoPrices[coinId];
              const currentPrice = priceData?.usd || 0;
              const totalValue = quantity * currentPrice;
              
              return (
                <div key={coinId} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div>
                    <p className="font-semibold uppercase">{coinId}</p>
                    <p className="text-sm text-muted-foreground">{quantity.toFixed(8)} coins</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${formatLargeNumber(totalValue)}</p>
                    <p className="text-xs text-muted-foreground">${currentPrice.toLocaleString()}/coin</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

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
                  
                  <div className="flex gap-2">
                    <Dialog open={sendDialogOpen && sendingCurrency === currency} onOpenChange={(open) => {
                      setSendDialogOpen(open);
                      if (open) setSendingCurrency(currency);
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          className="flex-1 gap-2" 
                          onClick={() => setSendingCurrency(currency)}
                        >
                          <Send className="w-4 h-4" />
                          Send
                        </Button>
                      </DialogTrigger>
                       <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Send {currency.toUpperCase()}</DialogTitle>
                          <DialogDescription>
                            Enter the recipient's address and amount to send
                          </DialogDescription>
                        </DialogHeader>
                        
                        {sendSuccess ? (
                          <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="relative">
                              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center animate-scale-in">
                                <Send className="w-10 h-10 text-success animate-fade-in" />
                              </div>
                              <div className="absolute inset-0 rounded-full bg-success/20 animate-ping" />
                            </div>
                            <p className="text-lg font-semibold text-success animate-fade-in">
                              Transaction Successful!
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4 mt-4">
                            {showQrScanner ? (
                              <div className="space-y-4">
                                <div className="relative">
                                  <div 
                                    id="qr-reader" 
                                    className="rounded-lg overflow-hidden border-2 border-primary"
                                  />
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="absolute top-2 right-2"
                                    onClick={stopQrScanner}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                                <p className="text-sm text-center text-muted-foreground">
                                  Position the QR code within the frame
                                </p>
                              </div>
                            ) : (
                              <>
                                <div className="space-y-2">
                                  <Label htmlFor="send-address">Recipient Address</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      id="send-address"
                                      placeholder={`Enter ${currency.toUpperCase()} address`}
                                      value={sendAddress}
                                      onChange={(e) => setSendAddress(e.target.value)}
                                      className="font-mono text-sm flex-1"
                                    />
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      onClick={startQrScanner}
                                      className="shrink-0"
                                    >
                                      <QrCode className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="send-amount">Amount</Label>
                                  <Input
                                    id="send-amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={sendAmount}
                                    min="0"
                                    step="0.00000001"
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (parseFloat(value) < 0) return;
                                      setSendAmount(value);
                                    }}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Available balance: ${formatLargeNumber(balance)}
                                  </p>
                                </div>
                                <Button 
                                  className="w-full transition-all duration-300 hover:scale-105" 
                                  onClick={handleSend}
                                  disabled={sendLoading}
                                >
                                  {sendLoading ? (
                                    <span className="flex items-center gap-2">
                                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      Sending...
                                    </span>
                                  ) : (
                                    `Send ${currency.toUpperCase()}`
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Dialog open={receiveDialogOpen && receivingCurrency === currency} onOpenChange={(open) => {
                      setReceiveDialogOpen(open);
                      if (open) setReceivingCurrency(currency);
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline"
                          className="flex-1 gap-2" 
                          onClick={() => setReceivingCurrency(currency)}
                        >
                          <Download className="w-4 h-4" />
                          Receive
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Receive {currency.toUpperCase()}</DialogTitle>
                          <DialogDescription>
                            Share this address or QR code to receive {currency.toUpperCase()}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 mt-4">
                          <div className="flex justify-center p-6 bg-white rounded-lg">
                            <QRCodeSVG 
                              value={address} 
                              size={200}
                              level="H"
                              includeMargin={true}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Your {currency.toUpperCase()} Address</Label>
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
                        </div>
                      </DialogContent>
                    </Dialog>
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
