import { type NextRequest, NextResponse } from "next/server";
import {
  assertConversationOwned,
  deleteConversation,
  getConversationMessages,
} from "@/lib/server/aiCoach";
import { getServerSupabase } from "@/lib/supabase/server";

// 会話のメッセージ一覧
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const owned = await assertConversationOwned(supabase, id, user.id);
  if (!owned) {
    return NextResponse.json(
      { error: "会話が見つかりません" },
      { status: 404 },
    );
  }

  const messages = await getConversationMessages(supabase, id);
  return NextResponse.json({ messages });
}

// 会話の削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  await deleteConversation(supabase, user.id, id);
  return NextResponse.json({ success: true });
}
