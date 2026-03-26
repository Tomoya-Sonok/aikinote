-- マイグレーション 013: サブスクリプション管理
-- AikiNote Premium サブスクリプション対応

-- UserSubscription テーブル（RevenueCat Webhook からの同期先）
CREATE TABLE IF NOT EXISTS "UserSubscription" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  revenuecat_customer_id TEXT,
  platform TEXT CHECK (platform IN ('web', 'ios', 'android')),
  entitlement_id TEXT,
  product_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('active', 'canceled', 'expired', 'billing_issue', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User テーブルにキャッシュ用カラム追加（API 高速判定用）
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_subscription_user_id ON "UserSubscription"(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscription_revenuecat_id ON "UserSubscription"(revenuecat_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscription_status ON "UserSubscription"(status);

-- RLS
ALTER TABLE "UserSubscription" ENABLE ROW LEVEL SECURITY;

-- 自分のサブスクリプション情報のみ閲覧可能
CREATE POLICY "subscription_select_own" ON "UserSubscription"
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_user_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_subscription_updated_at
  BEFORE UPDATE ON "UserSubscription"
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscription_updated_at();

-- UserSubscription 変更時に User.subscription_tier を自動同期するトリガー
CREATE OR REPLACE FUNCTION sync_user_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "User"
  SET subscription_tier = NEW.tier,
      updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_user_subscription_tier
  AFTER INSERT OR UPDATE OF tier ON "UserSubscription"
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_subscription_tier();
