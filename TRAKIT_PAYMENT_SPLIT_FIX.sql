-- TRAKIT_PAYMENT_SPLIT_FIX.sql
-- Run this AFTER TRAKIT_DEBT_MIGRATION.sql.
-- Fixes the Revenue Breakdown double-counting bug: when a partially-paid sale
-- later gets a debt payment via a different method, the old code re-attributed
-- the whole updated amount_paid to the sale's original payment_method, so the
-- same money showed up under two methods (e.g. Cash AND POS).
--
-- Fix: freeze the sale's ORIGINAL payment amount in a new column that never
-- changes after creation, separate from amount_paid (which keeps growing as
-- debt payments come in). Revenue Breakdown now reads the frozen amount for
-- the sale's own method, and each debt payment separately for its own method.

ALTER TABLE sales ADD COLUMN IF NOT EXISTS initial_amount_paid numeric;

-- Backfill: reconstruct what each sale's ORIGINAL payment was by subtracting
-- every debt payment already recorded against it from the current amount_paid.
-- This is fully accurate — your debt_payments rows were always correct, it was
-- only the Revenue Breakdown calculation reading the wrong field.
UPDATE sales s
SET initial_amount_paid = GREATEST(
  0,
  COALESCE(s.amount_paid, 0) - COALESCE((
    SELECT SUM(dp.amount) FROM debt_payments dp WHERE dp.sale_id = s.id
  ), 0)
)
WHERE initial_amount_paid IS NULL;
