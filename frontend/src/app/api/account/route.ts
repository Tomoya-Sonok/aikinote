import { NextResponse } from "next/server";
import { deleteAllUserObjects } from "@/lib/aws-s3";
import { buildApiUrl, createBackendAuthToken } from "@/lib/server/auth";
import { getServerSupabase } from "@/lib/supabase/server";

// アカウント削除 (App Store Guideline 5.1.1(v) 対応)
// 順序: S3 削除 → Hono DELETE /api/users/me (DB + Supabase auth 削除) → signOut。
// S3 削除は失敗しても DB 削除を優先する (Apple 要件は DB 削除完了が本質)。
export async function DELETE() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const userId = user.id;

  try {
    const result = await deleteAllUserObjects(userId);
    console.info(
      `[DELETE /api/account] S3 削除完了: ${result.totalDeleted} 件削除 / ${result.errors} 件失敗 (userId=${userId})`,
    );
  } catch (s3Error) {
    console.warn(
      `[DELETE /api/account] S3 削除失敗 (続行): ${
        s3Error instanceof Error ? s3Error.message : String(s3Error)
      }`,
    );
  }

  const token = await createBackendAuthToken();
  if (!token) {
    return NextResponse.json(
      { error: "認証トークンの生成に失敗しました" },
      { status: 500 },
    );
  }

  const response = await fetch(buildApiUrl("/api/users/me"), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error(
      `[DELETE /api/account] Hono DELETE /users/me 失敗: ${response.status} ${errorText}`,
    );
    return NextResponse.json(
      {
        error:
          "アカウントの削除に失敗しました。時間をおいて再度お試しください。",
      },
      { status: 500 },
    );
  }

  await supabase.auth.signOut().catch((e) => {
    console.warn(
      `[DELETE /api/account] signOut 失敗 (続行): ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  });

  return NextResponse.json({ success: true });
}
