import jwt from "jsonwebtoken";
import { cache } from "react";
import type { UserSession } from "@/lib/auth";
import { getCachedUserInfo } from "@/lib/server/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";

const HONO_API_BASE_URL =
  process.env.NEXT_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8787";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

type HonoUserInfo = {
  id: string;
  email: string;
  username: string;
  profile_image_url: string | null;
  dojo_style_name: string | null;
  dojo_style_id?: string | null;
  training_start_date?: string | null;
  aikido_rank?: string | null;
  full_name?: string | null;
  bio?: string | null;
  publicity_setting?: string | null;
  age_range?: string | null;
  gender?: string | null;
};

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${HONO_API_BASE_URL}${normalizedPath}`;
};

/** バックエンド用 JWT の発行に必要な最小限のユーザー情報 */
export type AuthTokenUser = {
  id: string;
  email?: string | null;
};

/** 検証済みの認証ユーザー（アクセストークンの claims 由来） */
export type VerifiedAuthUser = {
  id: string;
  email: string;
};

/**
 * 現在のリクエストの認証ユーザーを検証して返す。
 *
 * `auth.getUser()` は毎回 Supabase Auth サーバーへの HTTP 往復が発生するため、
 * まず `auth.getClaims()` で検証する。非対称署名キーのプロジェクトでは JWKS による
 * ローカル検証となり（JWKS はモジュールレベルでキャッシュされ初回のみ取得）、
 * HS256 等の対称キーの場合は getClaims 内部で getUser() に自動フォールバックする
 * ため、どちらの構成でも挙動退行はない。
 * getClaims が失敗した場合のみ、@supabase/ssr のトークンリフレッシュ経路を温存する
 * ため getUser() を 1 回だけ試す。
 */
export const getVerifiedAuthUser =
  async (): Promise<VerifiedAuthUser | null> => {
    const supabase = await getServerSupabase();

    try {
      const { data, error } = await supabase.auth.getClaims();
      if (!error && data?.claims?.sub) {
        return {
          id: data.claims.sub,
          email: typeof data.claims.email === "string" ? data.claims.email : "",
        };
      }
    } catch (claimsError) {
      console.error(
        "getVerifiedAuthUser: getClaims に失敗、getUser にフォールバックします:",
        claimsError,
      );
    }

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        return null;
      }
      return { id: user.id, email: user.email ?? "" };
    } catch {
      return null;
    }
  };

const createBackendAuthTokenFromUser = (user: AuthTokenUser | null) => {
  if (!user) {
    return null;
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email ?? "",
    },
    JWT_SECRET,
    {
      expiresIn: "24h",
    },
  );
};

export const createBackendAuthToken = async () => {
  const user = await getVerifiedAuthUser();
  return createBackendAuthTokenFromUser(user);
};

export const fetchUserInfoFromHono = async (
  userId: string,
  userOverride?: AuthTokenUser | null,
): Promise<UserSession | null> => {
  const token =
    createBackendAuthTokenFromUser(userOverride ?? null) ||
    (await createBackendAuthToken());
  if (!token) {
    return null;
  }

  const response = await fetch(buildApiUrl(`/api/users/${userId}`), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const result: ApiResponse<HonoUserInfo> = await response
    .json()
    .catch(() => ({ success: false, error: "Invalid JSON response" }));

  if (!result.success || !result.data) {
    return null;
  }

  const data = result.data;
  if (!data.id || !data.email || !data.username) {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    username: data.username,
    profile_image_url: data.profile_image_url || null,
    dojo_style_name: data.dojo_style_name || null,
    dojo_style_id: data.dojo_style_id || null,
    aikido_rank: data.aikido_rank || null,
    full_name: data.full_name || null,
    bio: data.bio ?? null,
    publicity_setting: data.publicity_setting ?? null,
    age_range: data.age_range ?? null,
    gender: data.gender ?? null,
    training_start_date: data.training_start_date ?? null,
  };
};

// React の cache() で同一 RSC レンダー内の呼び出しを 1 回にまとめる。
// 例: mypage は AuthGate と MyPageInitializer の両方が getCurrentUser を呼ぶため、
// ラップしないと認証検証とユーザー情報取得が二重に走る（Route Handler では no-op）。
export const getCurrentUser = cache(async (): Promise<UserSession | null> => {
  try {
    const user = await getVerifiedAuthUser();

    if (!user) {
      return null;
    }

    // キャッシュを利用してユーザー情報取得
    return await getCachedUserInfo(user.id, user);
  } catch (error) {
    console.error("Unexpected error in getCurrentUser:", error);
    return null;
  }
});

export async function getUserInfo(userId: string) {
  try {
    const userInfo = await fetchUserInfoFromHono(userId);

    if (userInfo) {
      return { data: userInfo, error: null };
    }

    return { data: null, error: { message: "User not found" } };
  } catch (error) {
    console.error("getUserInfo API call failed:", error);
    return { data: null, error: { message: "API call failed" } };
  }
}
