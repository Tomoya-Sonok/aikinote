import { NextResponse } from "next/server";
import { checkAiCoachUsageAllowed } from "@/lib/aiCoach/usageLimit";
import {
  countTodayUserMessages,
  getUserTierAndUsage,
} from "@/lib/server/aiCoach";
import { getServerSupabase } from "@/lib/supabase/server";

// 送信前の利用可否チェック（クライアントが PremiumUpgradeModal 表示判定に使う）
export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { tier, lifetimeCount } = await getUserTierAndUsage(supabase, user.id);
  const todayCount = await countTodayUserMessages(supabase);
  const usage = checkAiCoachUsageAllowed({ tier, lifetimeCount, todayCount });

  return NextResponse.json({
    allowed: usage.allowed,
    reason: usage.reason ?? null,
    tier,
  });
}
