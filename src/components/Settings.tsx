import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Shield, DollarSign, Loader2, Mail, Lock, User, Gift } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Codes from './Codes';

const Settings = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');

  const updateEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setUpdatingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Email updated successfully. Please check your inbox for confirmation.',
      });
      setNewEmail('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update email',
        variant: 'destructive',
      });
    } finally {
      setUpdatingEmail(false);
    }
  };

  const updatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: 'Invalid Password',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords Don\'t Match',
        description: 'Please make sure passwords match',
        variant: 'destructive',
      });
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Password updated successfully',
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password',
        variant: 'destructive',
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const addFunds = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    // If no user ID is entered, use admin's own ID
    const targetId = targetUserId.trim() || user?.id;

    if (!targetId) {
      toast({
        title: 'Error',
        description: 'Unable to determine target user',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get current balance
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance_usd')
        .eq('user_id', targetId)
        .maybeSingle();

      if (!walletData) {
        toast({
          title: 'Error',
          description: 'Wallet not found for this user',
          variant: 'destructive',
        });
        return;
      }

      const newBalance = Number(walletData.balance_usd) + Number(amount);

      // Update balance
      const { error } = await supabase
        .from('wallets')
        .update({ balance_usd: newBalance })
        .eq('user_id', targetId);

      if (error) throw error;

      const targetMessage = targetId === user?.id 
        ? "your wallet" 
        : "user's wallet";

      toast({
        title: 'Success!',
        description: `Added $${amount} to ${targetMessage}`,
      });

      setAmount('');
      setTargetUserId('');
    } catch (error) {
      console.error('Error adding funds:', error);
      toast({
        title: 'Error',
        description: 'Failed to add funds',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Settings Tabs */}
      <Tabs defaultValue="account" className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} bg-secondary rounded-2xl p-1`}>
          <TabsTrigger value="account" className="rounded-xl data-[state=active]:bg-card">
            <User className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="codes" className="rounded-xl data-[state=active]:bg-card">
            <Gift className="w-4 h-4 mr-2" />
            Codes
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="rounded-xl data-[state=active]:bg-card">
              <Shield className="w-4 h-4 mr-2" />
              Admin
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="account" className="mt-4 space-y-4">
          {/* Profile Section */}
          <Card className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Profile Information</h2>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-xs">{user?.id}</p>
              </div>
            </div>
          </Card>

          {/* Change Email */}
          <Card className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Change Email</h2>
            </div>
            
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="New email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Button 
                onClick={updateEmail}
                disabled={updatingEmail || !newEmail}
                className="w-full"
              >
                {updatingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Email'
                )}
              </Button>
            </div>
          </Card>

          {/* Change Password */}
          <Card className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Change Password</h2>
            </div>
            
            <div className="space-y-3">
              <Input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Button 
                onClick={updatePassword}
                disabled={updatingPassword || !newPassword || !confirmPassword}
                className="w-full"
              >
                {updatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Codes Tab */}
        <TabsContent value="codes" className="mt-4">
          <Codes />
        </TabsContent>

        {/* Admin Tab */}
        {isAdmin && (
          <TabsContent value="admin" className="mt-4 space-y-4">
        <Card className="glass-card p-6 border-2 border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Admin Panel</h2>
              <p className="text-xs text-muted-foreground">Administrator privileges</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Add Funds to User Wallet
              </label>
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="User ID (leave empty for your account)"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  disabled={loading}
                />
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-9"
                      disabled={loading}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <Button
                    onClick={addFunds}
                    disabled={loading || !amount}
                    className="shrink-0"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Add'
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Add USD to any wallet. Leave User ID empty to add to your own account.
              </p>
            </div>
          </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* App Info */}
      <Card className="glass-card p-6">
        <h3 className="font-semibold mb-3">About</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>CryptoTrade v1.0</p>
          <p>Built with Lovable</p>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
