import { type NextRequest, NextResponse } from "next/server";
import {
  deleteConversation,
  getConversationMessages,
  getOwnedConversationFeedback,
} from "@/lib/server/aiCoach";
import { getServerSupabase } from "@/lib/supabase/server";

// 会話のメッセージ一覧 + フィードバック表示可否
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

  // 所有チェックを兼ねてフィードバック状態を取得（1クエリ）
  const conversation = await getOwnedConversationFeedback(
    supabase,
    id,
    user.id,
  );
  if (!conversation) {
    return NextResponse.json(
      { error: "会話が見つかりません" },
      { status: 404 },
    );
  }

  const messages = await getConversationMessages(supabase, id);
  return NextResponse.json({
    messages,
    // 回答済み（feedback 非 NULL）または非表示化済みの会話では二度と表示しない
    isFeedbackVisible:
      conversation.is_feedback_visible && conversation.feedback === null,
  });
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
