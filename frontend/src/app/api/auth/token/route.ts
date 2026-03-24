import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  createSuccessResponse,
  createUnauthorizedResponse,
  handleApiError,
} from "@/lib/utils/api-response";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// TODO: クライアント側のAPI呼び出しはtRPC経由に統一したため、将来的に削除予定
export async function POST(_request: NextRequest) {
  try {
    // セッション確認
    const serverSupabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await serverSupabase.auth.getUser();

    if (authError || !user) {
      return createUnauthorizedResponse("認証が必要です");
    }

    // JWTトークンを生成
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email ?? "",
      },
      JWT_SECRET,
      {
        expiresIn: "24h",
      },
    );

    return createSuccessResponse(
      { token },
      { message: "認証トークンを生成しました" },
    );
  } catch (err) {
    return handleApiError(err, "POST /api/auth/token");
  }
}
