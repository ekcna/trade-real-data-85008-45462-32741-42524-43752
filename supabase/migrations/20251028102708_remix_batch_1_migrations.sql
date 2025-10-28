
-- Migration: 20251027203155

-- Migration: 20251027200637

-- Migration: 20251027191218

-- Migration: 20251027185124

-- Migration: 20251027184452
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default 'user' role for new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  RETURN new;
END;
$$;

-- Trigger to auto-create user role on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  );
  RETURN new;
END;
$$;

-- Trigger for profile creation
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Create trades table for tracking buy/sell history
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coin_id TEXT NOT NULL,
  coin_symbol TEXT NOT NULL,
  coin_name TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  quantity DECIMAL NOT NULL,
  price_usd DECIMAL NOT NULL,
  total_usd DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Trades RLS policies
CREATE POLICY "Users can view their own trades"
  ON public.trades
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades"
  ON public.trades
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all trades"
  ON public.trades
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- Migration: 20251027185534
-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create wallets table to track user balances
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance_usd NUMERIC NOT NULL DEFAULT 10000.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Create policies for wallets
CREATE POLICY "Users can view their own wallet"
ON public.wallets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
ON public.wallets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet"
ON public.wallets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets"
ON public.wallets
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all wallets"
ON public.wallets
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger to auto-create wallet for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance_usd)
  VALUES (new.id, 10000.00);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_wallet();

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251027190722
-- Add referral code to profiles
ALTER TABLE public.profiles
ADD COLUMN referral_code TEXT UNIQUE,
ADD COLUMN referred_by TEXT,
ADD COLUMN referral_rewards_usd NUMERIC DEFAULT 0;

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character code (uppercase letters and numbers)
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Create trigger to auto-generate referral code for new profiles
CREATE OR REPLACE FUNCTION public.handle_profile_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profile_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_referral_code();

-- Update existing profiles with referral codes
UPDATE public.profiles
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;


-- Migration: 20251027195638
-- Trigger types regeneration
-- This comment ensures the types file gets regenerated with current schema
COMMENT ON TABLE public.profiles IS 'User profile information including referral data';
COMMENT ON TABLE public.wallets IS 'User wallet balances for trading';
COMMENT ON TABLE public.trades IS 'Historical trading records';
COMMENT ON TABLE public.user_roles IS 'User role assignments for access control';


-- Migration: 20251027195712
-- Force schema update to regenerate types
-- Add and immediately remove a temporary column to trigger type generation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS temp_trigger_column text;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS temp_trigger_column;



-- Migration: 20251027201456
-- Add wallet_address to profiles table
ALTER TABLE public.profiles 
ADD COLUMN wallet_address TEXT;

-- Create function to generate wallet address
CREATE OR REPLACE FUNCTION public.generate_wallet_address()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  address TEXT;
BEGIN
  -- Generate a realistic looking wallet address (0x + 40 hex characters)
  address := '0x' || upper(substring(md5(random()::text || random()::text) from 1 for 40));
  RETURN address;
END;
$$;

-- Create trigger to auto-generate wallet address for new profiles
CREATE OR REPLACE FUNCTION public.handle_wallet_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.wallet_address IS NULL THEN
    NEW.wallet_address := generate_wallet_address();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_wallet_address
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_wallet_address();

-- Create admin_codes table
CREATE TABLE public.admin_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.admin_codes ENABLE ROW LEVEL SECURITY;

-- Policies for admin_codes
CREATE POLICY "Anyone can read active codes"
ON public.admin_codes
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage codes"
ON public.admin_codes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert the admin code
INSERT INTO public.admin_codes (code, is_active)
VALUES ('ADMIN2025', true);

-- Migration: 20251027201517
-- Fix search_path for generate_wallet_address function
CREATE OR REPLACE FUNCTION public.generate_wallet_address()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  address TEXT;
BEGIN
  -- Generate a realistic looking wallet address (0x + 40 hex characters)
  address := '0x' || upper(substring(md5(random()::text || random()::text) from 1 for 40));
  RETURN address;
END;
$$;

-- Migration: 20251027201811
-- Fix search_path for handle_wallet_address trigger function
CREATE OR REPLACE FUNCTION public.handle_wallet_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.wallet_address IS NULL THEN
    NEW.wallet_address := generate_wallet_address();
  END IF;
  RETURN NEW;
END;
$$;

-- Migration: 20251027201844
-- Fix search_path for generate_referral_code function
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character code (uppercase letters and numbers)
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Migration: 20251027202534
-- Add new admin code
INSERT INTO public.admin_codes (code, is_active)
VALUES ('CAF12-12', true)
ON CONFLICT (code) DO NOTHING;

-- Create wallet_addresses table for multiple currencies
CREATE TABLE IF NOT EXISTS public.wallet_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, currency)
);

ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet addresses"
ON public.wallet_addresses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet addresses"
ON public.wallet_addresses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to generate wallet addresses for different currencies
CREATE OR REPLACE FUNCTION public.generate_crypto_address(currency TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  address TEXT;
BEGIN
  CASE currency
    WHEN 'bitcoin' THEN
      -- Bitcoin addresses start with 1, 3, or bc1
      address := 'bc1' || lower(substring(md5(random()::text || random()::text) from 1 for 39));
    WHEN 'ethereum' THEN
      -- Ethereum addresses start with 0x
      address := '0x' || lower(substring(md5(random()::text || random()::text) from 1 for 40));
    WHEN 'solana' THEN
      -- Solana addresses are base58 encoded
      address := upper(substring(md5(random()::text || random()::text || random()::text) from 1 for 44));
    WHEN 'tether' THEN
      -- USDT uses Ethereum addresses
      address := '0x' || lower(substring(md5(random()::text || random()::text) from 1 for 40));
    ELSE
      address := '0x' || lower(substring(md5(random()::text || random()::text) from 1 for 40));
  END CASE;
  
  RETURN address;
END;
$$;

-- Function to initialize wallet addresses for new users
CREATE OR REPLACE FUNCTION public.initialize_wallet_addresses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallet_addresses (user_id, currency, address)
  VALUES 
    (NEW.id, 'bitcoin', generate_crypto_address('bitcoin')),
    (NEW.id, 'ethereum', generate_crypto_address('ethereum')),
    (NEW.id, 'solana', generate_crypto_address('solana')),
    (NEW.id, 'tether', generate_crypto_address('tether'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_wallet_addresses
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.initialize_wallet_addresses();

-- Add last_bonus_claim to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_bonus_claim TIMESTAMP WITH TIME ZONE;

-- Migration: 20251027202822
-- Add wallet addresses for existing users who don't have them
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM auth.users 
    WHERE NOT EXISTS (
      SELECT 1 FROM public.wallet_addresses 
      WHERE wallet_addresses.user_id = users.id
    )
  LOOP
    INSERT INTO public.wallet_addresses (user_id, currency, address)
    VALUES 
      (user_record.id, 'bitcoin', generate_crypto_address('bitcoin')),
      (user_record.id, 'ethereum', generate_crypto_address('ethereum')),
      (user_record.id, 'solana', generate_crypto_address('solana')),
      (user_record.id, 'tether', generate_crypto_address('tether'))
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

