-- Migration: Add subscription tracking fields to profiles
-- Date: 2026-02-14
-- Description: Support monthly subscriptions alongside lifetime purchases

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for looking up users by Stripe customer ID (webhook lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
ON profiles(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN profiles.subscription_type IS 'monthly, lifetime, or NULL (free)';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for subscription management';
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Active Stripe subscription ID';
COMMENT ON COLUMN profiles.subscription_expires_at IS 'End of current billing period for monthly subscribers';
