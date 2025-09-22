import { NextRequest } from "next/server";
import {
  getServerSupabase,
  getServiceRoleSupabase,
} from "@/lib/supabase/server";
import {
  createBadRequestResponse,
  createForbiddenResponse,
  createInternalServerErrorResponse,
  createNotFoundResponse,
  createSuccessResponse,
  handleApiError,
} from "@/lib/utils/api-response";
import { usernameSchema } from "@/lib/utils/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { userId } = params;

    // まず通常のSupabaseクライアントでセッション確認
    const serverSupabase = getServerSupabase();
    const {
      data: { session },
      error: sessionError,
    } = await serverSupabase.auth.getSession();

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
      const origin = request.headers.get("origin");
      const host = request.headers.get("host");
      if (
        origin === `https://${host}` ||
        origin === `http://${host}` ||
        !origin
      ) {
        canAccess = true;
      }
    }

    if (!canAccess) {
      return createForbiddenResponse(
        "このユーザー情報へのアクセス権限がありません",
      );
    }

    // Service Roleを使用してユーザー取得
    const serviceSupabase = getServiceRoleSupabase();

    // Service Roleを使用してUserテーブルからユーザー取得
    const { data: userDataById, error: userByIdError } = await serviceSupabase
      .from("User")
      .select(
        "id, email, username, profile_image_url, dojo_style_name, is_email_verified",
      )
      .eq("id", userId)
      .maybeSingle();

    if (userByIdError) {
      console.error("API: Userテーブル検索エラー", userByIdError);
      return createInternalServerErrorResponse(userByIdError.message);
    }

    if (!userDataById) {
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
        dojo_style_name: userDataById.dojo_style_name,
        is_email_verified: userDataById.is_email_verified,
      }),
    };

    return createSuccessResponse(sanitizedUserData, {
      message: "ユーザー情報を取得しました",
    });
  } catch (err) {
    return handleApiError(err, "GET /api/user/[userId]");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { userId } = params;

    // セッション確認
    const serverSupabase = getServerSupabase();
    const {
      data: { session },
      error: sessionError,
    } = await serverSupabase.auth.getSession();

    if (!session?.user) {
      return createForbiddenResponse("認証が必要です");
    }

    // 本人のプロフィールのみ更新可能
    if (session.user.id !== userId) {
      return createForbiddenResponse(
        "他のユーザーのプロフィールは更新できません",
      );
    }

    // リクエストボディの取得とバリデーション
    const body = await request.json();
    const { username, dojo_style_name, training_start_date } = body;

    // ユーザー名のバリデーション
    if (username !== undefined) {
      try {
        usernameSchema.parse({ username });
      } catch (error) {
        return createBadRequestResponse("無効なユーザー名です");
      }
    }

    // Service Roleでユーザー情報を更新
    const serviceSupabase = getServiceRoleSupabase();

    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (dojo_style_name !== undefined)
      updateData.dojo_style_name = dojo_style_name || null;
    if (training_start_date !== undefined)
      updateData.training_start_date = training_start_date || null;

    const { data: updatedUser, error: updateError } = await serviceSupabase
      .from("User")
      .update(updateData)
      .eq("id", userId)
      .select(
        "id, email, username, profile_image_url, dojo_style_name, training_start_date",
      )
      .single();

    if (updateError) {
      return createInternalServerErrorResponse(
        "プロフィールの更新に失敗しました",
      );
    }

    return createSuccessResponse(updatedUser, {
      message: "プロフィールを更新しました",
    });
  } catch (err) {
    return handleApiError(err, "PUT /api/user/[userId]");
  }
}
