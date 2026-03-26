import { Purchases } from "@revenuecat/purchases-js";

const REVENUECAT_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY ?? "";

let purchasesInstance: Purchases | null = null;
let configuredUserId: string | null = null;

/**
 * RevenueCat Web SDK のインスタンスを新規作成
 * Stripe Elements の "Element has already been destroyed" を防ぐため、
 * purchase の前には必ず新しいインスタンスを作成する
 */
function createInstance(userId: string): Purchases | null {
  if (typeof window === "undefined") return null;
  if (!REVENUECAT_API_KEY) return null;

  purchasesInstance = Purchases.configure(REVENUECAT_API_KEY, userId);
  configuredUserId = userId;
  return purchasesInstance;
}

/**
 * 既存インスタンスを取得、なければ作成
 */
function getOrCreateInstance(userId: string): Purchases | null {
  if (purchasesInstance && configuredUserId === userId) {
    return purchasesInstance;
  }
  return createInstance(userId);
}

/**
 * Supabase user_id で RevenueCat を初期化
 */
export async function identifyUser(userId: string): Promise<void> {
  getOrCreateInstance(userId);
}

/**
 * Offerings（月額/年額プラン）を取得
 */
export async function getOfferings() {
  if (!purchasesInstance) return null;

  try {
    return await purchasesInstance.getOfferings();
  } catch (error) {
    console.error("[RevenueCat Web] offerings 取得エラー:", error);
    return null;
  }
}

/**
 * パッケージを購入（Stripe Checkout を表示）
 * 毎回インスタンスを再作成して Stripe Elements の破棄問題を回避
 */
// biome-ignore lint/suspicious/noExplicitAny: RevenueCat SDK の Package 型が複雑なため any で受ける
export async function purchasePackage(rcPackage: any) {
  if (!configuredUserId) {
    throw new Error(
      "RevenueCat が初期化されていません（identifyUser を先に呼んでください）",
    );
  }

  // Stripe Elements を新規作成するためインスタンスを再生成
  const instance = createInstance(configuredUserId);
  if (!instance) {
    throw new Error("RevenueCat の初期化に失敗しました");
  }

  try {
    const { customerInfo } = await instance.purchase({
      rcPackage,
    });
    return customerInfo;
  } catch (error: unknown) {
    const err = error as { userCancelled?: boolean };
    if (err.userCancelled) return null;
    throw error;
  }
}

/**
 * 現在の CustomerInfo を取得
 */
export async function getCustomerInfo() {
  if (!purchasesInstance) return null;

  try {
    return await purchasesInstance.getCustomerInfo();
  } catch (error) {
    console.error("[RevenueCat Web] customerInfo 取得エラー:", error);
    return null;
  }
}

/**
 * Premium entitlement が有効かチェック
 */
export function isPremiumFromCustomerInfo(
  customerInfo: {
    entitlements?: { active?: Record<string, unknown> };
  } | null,
): boolean {
  if (!customerInfo?.entitlements?.active) return false;
  return "AikiNote Premium" in customerInfo.entitlements.active;
}
