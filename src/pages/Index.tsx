import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import MarketOverviewWithChart from "@/components/MarketOverviewWithChart";
import Wallet from "@/components/Wallet";
import Settings from "@/components/Settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, TrendingUp, Wallet as WalletIcon, Settings as SettingsIcon } from "lucide-react";

const Index = () => {
  const [selectedCoin, setSelectedCoin] = useState<any>(null);
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">CryptoTrade</h1>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/admin')}
                className="rounded-xl"
              >
                <Shield className="w-4 h-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut}
              className="rounded-xl"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="wallet" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-secondary rounded-2xl p-1">
            <TabsTrigger 
              value="wallet" 
              className="rounded-xl data-[state=active]:bg-card"
            >
              <WalletIcon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Wallet</span>
            </TabsTrigger>
            <TabsTrigger 
              value="market" 
              className="rounded-xl data-[state=active]:bg-card"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Market</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="rounded-xl data-[state=active]:bg-card"
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="wallet" className="mt-0">
            <Wallet />
          </TabsContent>
          
          <TabsContent value="market" className="mt-0">
            <MarketOverviewWithChart onCoinSelect={setSelectedCoin} />
          </TabsContent>
          
          <TabsContent value="settings" className="mt-0">
            <Settings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
