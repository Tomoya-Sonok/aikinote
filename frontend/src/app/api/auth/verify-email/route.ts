import { NextRequest } from "next/server";

import type { UserSession } from "@/lib/auth";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import {
  createInternalServerErrorResponse,
  createSuccessResponse,
  createValidationErrorResponse,
  handleApiError,
} from "@/lib/utils/api-response";
import { isTokenExpired } from "@/lib/utils/auth-server";
import { getRedirectUrl } from "@/lib/utils/env";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return createValidationErrorResponse("認証トークンが提供されていません");
    }

    const supabase = getServiceRoleSupabase();

    const { data: user, error: findError } = await supabase
      .from("User")
      .select(
        "id, email, username, profile_image_url, dojo_style_name, is_email_verified, verification_token, created_at",
      )
      .eq("verification_token", token)
      .maybeSingle(); // singleの代わりにmaybeSingleを使用

    if (findError || !user) {
      console.error("verify-email: ユーザー取得エラー", {
        findError,
        token: `${token.slice(0, 8)}...`,
      });
      return createValidationErrorResponse("無効な認証トークンです");
    }

    const generateMagicLink = async (email: string) => {
      try {
        const { data: linkData, error: linkError } =
          await supabase.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: {
              redirectTo: getRedirectUrl("/auth/callback"),
            },
          });

        if (linkError) {
          console.error("verify-email: マジックリンク生成エラー", linkError);
          return { emailOtp: null, actionLink: null };
        }

        return {
          emailOtp: linkData?.properties?.email_otp ?? null,
          actionLink: linkData?.properties?.action_link ?? null,
        };
      } catch (linkError) {
        console.error("verify-email: マジックリンク生成中に例外", linkError);
        return { emailOtp: null, actionLink: null };
      }
    };

    const responseUser: UserSession = {
      id: user.id,
      email: user.email,
      username: user.username,
      profile_image_url: user.profile_image_url ?? null,
      dojo_style_name: user.dojo_style_name ?? null,
    };

    if (user.is_email_verified) {
      const magicLink = await generateMagicLink(user.email);

      return createSuccessResponse(
        {
          user: responseUser,
          emailOtp: magicLink.emailOtp,
          actionLink: magicLink.actionLink,
        },
        {
          message: "このアカウントは既に認証済みです",
        },
      );
    }

    if (isTokenExpired(new Date(user.created_at))) {
      return createValidationErrorResponse(
        "認証トークンの有効期限が切れています",
      );
    }

    const { error: updateError } = await supabase
      .from("User")
      .update({
        is_email_verified: true,
        verification_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      return createInternalServerErrorResponse("認証の更新に失敗しました");
    }

    try {
      await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });
    } catch (adminError) {
      console.error("Supabase admin email confirm error", adminError);
    }

    const magicLink = await generateMagicLink(user.email);

    return createSuccessResponse(
      {
        user: responseUser,
        emailOtp: magicLink.emailOtp,
        actionLink: magicLink.actionLink,
      },
      {
        message: "メールアドレスの認証が完了しました",
      },
    );
  } catch (error) {
    return handleApiError(error, "POST /api/auth/verify-email");
  }
}
