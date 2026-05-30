import { type NextRequest, NextResponse } from "next/server";
import { createConversation, listConversations } from "@/lib/server/aiCoach";
import { getServerSupabase } from "@/lib/supabase/server";

// 会話一覧
export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const conversations = await listConversations(supabase, user.id);
  return NextResponse.json({ conversations });
}

// 会話作成
export async function POST(request: NextRequest) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let title = "";
  try {
    const body = (await request.json()) as { title?: string };
    title = (body.title ?? "").slice(0, 60);
  } catch {
    // ボディ無しでも可
  }

  const conversation = await createConversation(supabase, user.id, title);
  if (!conversation) {
    return NextResponse.json(
      { error: "会話の作成に失敗しました" },
      { status: 500 },
    );
  }
  return NextResponse.json({ conversation }, { status: 201 });
}
