-- schema.sql
-- This file defines the Supabase database schema for the Golf Charity Subscription Platform.

-- 1. Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE sub_status AS ENUM ('active', 'inactive', 'canceled');

-- 2. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  role user_role DEFAULT 'user',
  subscription_status sub_status DEFAULT 'inactive',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_plan TEXT DEFAULT 'monthly', -- 'monthly' or 'yearly'
  subscription_expires TIMESTAMP WITH TIME ZONE,
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  selected_charity_id UUID,
  charity_percentage NUMERIC DEFAULT 10 CHECK (charity_percentage >= 10 AND charity_percentage <= 100),
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Charities table
CREATE TABLE IF NOT EXISTS public.charities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT DEFAULT 'General',
  upcoming_events JSONB DEFAULT '[]'::jsonb,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add foreign key constraint to profiles now that charities exists
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_selected_charity FOREIGN KEY (selected_charity_id) REFERENCES public.charities (id);

-- 4. Scores table (Max 5 per user handled via trigger or backend logic)
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Draws table
CREATE TABLE IF NOT EXISTS public.draws (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  draw_month DATE NOT NULL,
  winning_numbers INTEGER[] CHECK (array_length(winning_numbers, 1) = 5),
  is_published BOOLEAN DEFAULT false,
  total_pool NUMERIC DEFAULT 0,
  jackpot_rolled_over BOOLEAN DEFAULT false,
  draw_type TEXT DEFAULT 'random', -- 'random' or 'algorithmic'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Winners table
CREATE TABLE IF NOT EXISTS public.winners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  draw_id UUID REFERENCES public.draws(id) NOT NULL,
  match_tier INTEGER NOT NULL CHECK (match_tier IN (3, 4, 5)),
  prize_amount NUMERIC NOT NULL,
  proof_image_url TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Donations table (PRD Section 08)
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id), -- Nullable for guests
  charity_id UUID REFERENCES public.charities(id) NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Note: RLS (Row Level Security) policies should be added here to restrict access appropriately
-- Example: Users can only read/update their own profile
-- Users can only insert/read their own scores
-- Admin can do everything

-- 7. Automatically generate a profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    'user'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
