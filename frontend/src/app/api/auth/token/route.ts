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

export async function POST(_request: NextRequest) {
  try {
    // セッション確認
    const serverSupabase = await getServerSupabase();
    const {
      data: { session },
    } = await serverSupabase.auth.getSession();

    if (!session?.user) {
      return createUnauthorizedResponse("認証が必要です");
    }

    // JWTトークンを生成
    const token = jwt.sign(
      {
        userId: session.user.id,
        email: session.user.email,
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
