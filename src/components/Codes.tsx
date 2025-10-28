import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Gift, Loader2 } from 'lucide-react';

const Codes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const redeemCode = async () => {
    if (!code.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Check if code exists and is active
      const { data: existingCode, error: existingError } = await supabase
        .from('admin_codes' as any)
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (existingError || !existingCode) {
        toast({
          title: 'Invalid Code',
          description: 'This code is not valid or has already been used',
          variant: 'destructive',
        });
        return;
      }

      // Check if user already has admin role
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('user_roles' as any)
        .select('*')
        .eq('user_id', user?.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (existingRole) {
        toast({
          title: 'Already Admin',
          description: 'You are already an administrator',
        });
        return;
      }

      // Add admin role
      const { error: insertError } = await supabase
        .from('user_roles' as any)
        .insert({
          user_id: user?.id,
          role: 'admin'
        } as any);

      if (insertError) {
        toast({
          title: 'Error',
          description: 'Failed to apply admin role',
          variant: 'destructive',
        });
        return;
      }

      // Mark code as used
      const { error: updateError } = await supabase
        .from('admin_codes' as any)
        .update({
          used_by: user?.id,
          used_at: new Date().toISOString(),
          is_active: false
        } as any)
        .eq('id', (existingCode as any).id);

      toast({
        title: 'Success!',
        description: 'You are now an administrator. Please refresh the page.',
      });

      setCode('');
      
      // Refresh the page after a delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error redeeming code:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while redeeming the code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card p-8">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <Gift className="w-8 h-8 text-primary" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-2">Redeem Code</h2>
            <p className="text-muted-foreground text-sm">
              Enter your admin code to unlock special features
            </p>
          </div>

          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Enter code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="text-center text-lg font-mono uppercase"
              disabled={loading}
            />

            <Button
              className="w-full py-6"
              onClick={redeemCode}
              disabled={loading || !code.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redeeming...
                </>
              ) : (
                'Redeem Code'
              )}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="glass-card p-6">
        <div className="space-y-3">
          <h3 className="font-semibold">About Codes</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Special codes grant admin privileges</li>
            <li>• Each code can only be used once</li>
            <li>• Admin features include wallet management</li>
            <li>• Use code: <span className="font-mono font-bold">ADMIN2024</span></li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default Codes;
