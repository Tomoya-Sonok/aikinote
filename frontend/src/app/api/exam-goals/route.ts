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
 * GET /api/exam-goals — 審査目標取得（Hono Backend へプロキシ）
 */
export async function GET() {
  const token = await createAuthToken();
  if (!token) {
    return NextResponse.json({ error: "認証エラー" }, { status: 401 });
  }

  const response = await fetch(`${HONO_API_BASE_URL}/api/exam-goals`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

/**
 * PUT /api/exam-goals — 審査目標作成・更新（Hono Backend へプロキシ）
 */
export async function PUT(request: NextRequest) {
  const token = await createAuthToken();
  if (!token) {
    return NextResponse.json({ error: "認証エラー" }, { status: 401 });
  }

  const body = await request.json();

  const response = await fetch(`${HONO_API_BASE_URL}/api/exam-goals`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

/**
 * DELETE /api/exam-goals — 審査目標削除（Hono Backend へプロキシ）
 */
export async function DELETE() {
  const token = await createAuthToken();
  if (!token) {
    return NextResponse.json({ error: "認証エラー" }, { status: 401 });
  }

  const response = await fetch(`${HONO_API_BASE_URL}/api/exam-goals`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
