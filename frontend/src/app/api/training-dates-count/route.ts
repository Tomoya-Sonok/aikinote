import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

const HONO_API_BASE_URL =
  process.env.NEXT_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8787";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

async function createAuthToken(): Promise<string | null> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return jwt.sign({ userId: user.id, email: user.email ?? "" }, JWT_SECRET, {
    expiresIn: "24h",
  });
}

/**
 * GET /api/training-dates-count — 稽古日数カウント取得（Hono Backend へプロキシ）
 * query params: from, to
 */
export async function GET(request: NextRequest) {
  const token = await createAuthToken();
  if (!token) {
    return NextResponse.json({ error: "認証エラー" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const response = await fetch(
    `${HONO_API_BASE_URL}/api/training-dates/count?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
