import type { Session } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import type { UserSession } from "@/lib/auth";
import { getCachedUserProfile } from "@/lib/server/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";

const HONO_API_BASE_URL =
  process.env.NEXT_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8787";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

type HonoUserProfile = {
  id: string;
  email: string;
  username: string;
  profile_image_url: string | null;
  dojo_style_name: string | null;
  training_start_date?: string | null;
};

const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${HONO_API_BASE_URL}${normalizedPath}`;
};

const createBackendAuthTokenFromSession = (session: Session | null) => {
  if (!session?.user) {
    return null;
  }

  return jwt.sign(
    {
      userId: session.user.id,
      email: session.user.email ?? "",
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
    data: { session },
  } = await supabase.auth.getSession();
  return createBackendAuthTokenFromSession(session);
};

export const fetchUserProfileFromHono = async (
  userId: string,
  sessionOverride?: Session | null,
): Promise<UserSession | null> => {
  const token =
    createBackendAuthTokenFromSession(sessionOverride ?? null) ||
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

  const result: ApiResponse<HonoUserProfile> = await response
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
  };
};

export async function getCurrentUser(): Promise<UserSession | null> {
  const supabase = await getServerSupabase();

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      return null;
    }

    // キャッシュを利用してプロフィール取得
    return await getCachedUserProfile(session.user.id, session);
  } catch (error) {
    console.error("Unexpected error in getCurrentUser:", error);
    return null;
  }
}

export async function getUserProfile(userId: string) {
  try {
    const userProfile = await fetchUserProfileFromHono(userId);

    if (userProfile) {
      return { data: userProfile, error: null };
    }

    return { data: null, error: { message: "User not found" } };
  } catch (error) {
    console.error("getUserProfile API call failed:", error);
    return { data: null, error: { message: "API call failed" } };
  }
}
