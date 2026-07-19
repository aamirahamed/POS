-- Migration: Create bank_accounts and bank_transactions tables for Redbark integration

-- ── bank_accounts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id TEXT PRIMARY KEY,                            -- Redbark account ID
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL,                    -- Redbark connection ID
  name TEXT NOT NULL,                             -- e.g. "Personal Account #7456"
  institution_name TEXT NOT NULL,                 -- e.g. "NATIONAL AUSTRALIA BANK"
  account_number TEXT,                            -- Masked, e.g. "xxxx7456"
  type TEXT DEFAULT 'transaction',                -- transaction / savings / investment
  currency TEXT DEFAULT 'AUD',
  balance NUMERIC(12, 2) DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bank accounts"
  ON public.bank_accounts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── bank_transactions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id TEXT PRIMARY KEY,                            -- Redbark transaction ID
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  account_name TEXT,
  date DATE NOT NULL,
  datetime TIMESTAMPTZ,
  amount NUMERIC(12, 2) NOT NULL,                 -- negative = debit, positive = credit
  direction TEXT NOT NULL,                        -- 'debit' | 'credit'
  description TEXT,
  merchant_name TEXT,
  category TEXT DEFAULT 'Other',                  -- user-overridable category label
  raw_category TEXT,                              -- raw Redbark category (e.g. FOOD_AND_DRINK)
  status TEXT DEFAULT 'posted',                   -- 'posted' | 'pending'
  is_income BOOLEAN GENERATED ALWAYS AS (direction = 'credit') STORED,
  is_spending BOOLEAN GENERATED ALWAYS AS (direction = 'debit') STORED,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own transactions"
  ON public.bank_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON public.bank_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transaction categories"
  ON public.bank_transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── category_corrections ───────────────────────────────────────────────────────
-- Stores user-defined category overrides per merchant, persisted across syncs
CREATE TABLE IF NOT EXISTS public.category_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_key TEXT NOT NULL,                    -- lowercase merchant name
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, merchant_key)
);

ALTER TABLE public.category_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own category corrections"
  ON public.category_corrections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Indexes ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_id ON public.bank_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON public.bank_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_id ON public.bank_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_category ON public.bank_transactions(category);
