-- TRAKIT_DEBT_MIGRATION.sql
-- Run this in Supabase SQL Editor before deploying the debt-tracking feature.
-- Safe on production: only adds nullable/defaulted columns and one new table.

-- 1. New payment fields on sales, alongside the existing fulfillment `status` column
--    (that one is untouched — this is a separate payment-status field).
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'Paid';       -- 'Paid' | 'Partially Paid' | 'Credit'
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method text;                       -- 'Cash' | 'Transfer' | 'POS' | null (credit)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS outstanding_amount numeric DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS due_date date;

-- Backfill: every sale that already existed before this migration is treated as
-- fully paid in cash, with zero outstanding balance, so nothing shows up as a
-- false debt after you deploy this.
UPDATE sales
SET payment_status = 'Paid',
    payment_method = COALESCE(payment_method, 'Cash'),
    amount_paid = qty * unit_price,
    outstanding_amount = 0
WHERE payment_status IS NULL OR (payment_status = 'Paid' AND amount_paid = 0);

-- 2. New table: one row per payment made against an outstanding debt.
-- Linked to both the customer and the specific sale it's paying down, so a
-- single payment that spans multiple open sales creates multiple rows here.
CREATE TABLE IF NOT EXISTS debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL,           -- 'Cash' | 'Transfer' | 'POS'
  payment_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own debt payments" ON debt_payments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Note: this assumes sales.id and customers.id are uuid (Supabase's default).
-- If your existing tables use a different id type (e.g. bigint), change the
-- sale_id/customer_id column types above to match before running this.
