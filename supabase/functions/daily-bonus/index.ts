import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Daily bonus claim attempt by user: ${user.id}`);

    // Check last bonus claim
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_bonus_claim')
      .eq('id', user.id)
      .single();

    const now = new Date();
    const lastClaim = profile?.last_bonus_claim ? new Date(profile.last_bonus_claim) : null;

    // Check if 24 hours have passed
    if (lastClaim) {
      const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastClaim < 24) {
        const hoursUntilNext = Math.ceil(24 - hoursSinceLastClaim);
        console.log(`User ${user.id} already claimed today. Hours until next: ${hoursUntilNext}`);
        return new Response(
          JSON.stringify({ 
            error: 'Already claimed today',
            hoursUntilNext,
            canClaimAt: new Date(lastClaim.getTime() + (24 * 60 * 60 * 1000)).toISOString()
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get current balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance_usd')
      .eq('user_id', user.id)
      .single();

    if (!wallet) {
      console.error(`Wallet not found for user ${user.id}`);
      return new Response(
        JSON.stringify({ error: 'Wallet not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newBalance = Number(wallet.balance_usd) + 1000;

    // Update balance and last claim
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance_usd: newBalance })
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ last_bonus_claim: now.toISOString() })
      .eq('id', user.id);

    if (profileError) throw profileError;

    console.log(`Daily bonus claimed by user ${user.id}: $1000. New balance: $${newBalance}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        amount: 1000,
        newBalance,
        nextClaimAt: new Date(now.getTime() + (24 * 60 * 60 * 1000)).toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in daily-bonus function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
