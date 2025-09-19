import { getServiceRoleSupabase, getServerSupabase } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import {
  createSuccessResponse,
  createForbiddenResponse,
  createNotFoundResponse,
  createInternalServerErrorResponse,
  handleApiError,
} from "@/lib/utils/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    // まず通常のSupabaseクライアントでセッション確認
    const serverSupabase = getServerSupabase();
    const { data: { session }, error: sessionError } = await serverSupabase.auth.getSession();

    console.log("API: ユーザー取得開始", {
      userId,
      hasSession: !!session,
      requestingUserId: session?.user?.id
    });

    // セッションがある場合は、リクエストしているユーザーが本人または管理者かチェック
    let canAccess = false;
    if (session?.user) {
      // 本人のプロフィール取得は許可
      if (session.user.id === userId) {
        canAccess = true;
      }
      // 他のユーザーのプロフィール取得時は、その他のロジックを追加可能
    } else {
      // セッションがない場合（OAuth認証コールバック等）もService Roleで許可
      // ただし、内部APIコールのみに限定する
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');
      if (origin === `https://${host}` || origin === `http://${host}` || !origin) {
        canAccess = true;
      }
    }

    if (!canAccess) {
      console.log("API: アクセス権限なし", { userId, sessionUserId: session?.user?.id });
      return createForbiddenResponse("このユーザー情報へのアクセス権限がありません");
    }

    // Service Roleを使用してユーザー取得
    const serviceSupabase = getServiceRoleSupabase();

    // Service Roleを使用してUserテーブルからユーザー取得
    console.log("API: Service Role を使用してユーザー取得");
    const { data: userDataById, error: userByIdError } = await serviceSupabase
      .from("User")
      .select("id, email, username, profile_image_url, dojo_id, is_email_verified")
      .eq("id", userId)
      .maybeSingle();

    console.log("API: UserテーブルUserId検索結果", {
      found: !!userDataById,
      error: userByIdError?.message
    });

    if (userByIdError) {
      console.error("API: Userテーブル検索エラー", userByIdError);
      return createInternalServerErrorResponse(userByIdError.message);
    }

    if (!userDataById) {
      console.log("API: Userテーブルでユーザーが見つかりません", { userId });
      return createNotFoundResponse("ユーザープロフィールが見つかりません");
    }

    // 必要な情報のみ返却（セキュリティ強化）
    const sanitizedUserData = {
      id: userDataById.id,
      email: userDataById.email,
      username: userDataById.username,
      profile_image_url: userDataById.profile_image_url,
      // 本人以外には詳細情報を隠す
      ...(session?.user?.id === userId && {
        dojo_id: userDataById.dojo_id,
        is_email_verified: userDataById.is_email_verified
      })
    };

    console.log("API: UserテーブルでユーザーID検索成功");
    return createSuccessResponse(sanitizedUserData, {
      message: "ユーザー情報を取得しました"
    });

  } catch (err) {
    return handleApiError(err, "GET /api/user/[userId]");
  }
}