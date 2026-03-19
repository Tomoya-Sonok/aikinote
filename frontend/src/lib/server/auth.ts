import type { User } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
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
};

const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${HONO_API_BASE_URL}${normalizedPath}`;
};

const createBackendAuthTokenFromUser = (user: User | null) => {
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

const createBackendAuthToken = async () => {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return createBackendAuthTokenFromUser(user);
};

export const fetchUserInfoFromHono = async (
  userId: string,
  userOverride?: User | null,
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
  };
};

export async function getCurrentUser(): Promise<UserSession | null> {
  const supabase = await getServerSupabase();

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // キャッシュを利用してユーザー情報取得
    return await getCachedUserInfo(user.id, user);
  } catch (error) {
    console.error("Unexpected error in getCurrentUser:", error);
    return null;
  }
}

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
