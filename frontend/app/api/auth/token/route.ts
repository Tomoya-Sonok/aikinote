import { getServerSupabase } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import {
  createSuccessResponse,
  createUnauthorizedResponse,
  handleApiError,
} from "@/lib/utils/api-response";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export async function POST(request: NextRequest) {
  try {
    // セッション確認
    const serverSupabase = getServerSupabase();
    const { data: { session }, error: sessionError } = await serverSupabase.auth.getSession();

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
      }
    );

    console.log("JWT生成成功:", {
      userId: session.user.id,
      tokenLength: token.length,
      secretSet: !!JWT_SECRET,
      secretLength: JWT_SECRET.length
    });
    return createSuccessResponse(
      { token },
      { message: "認証トークンを生成しました" }
    );

  } catch (err) {
    return handleApiError(err, "POST /api/auth/token");
  }
}