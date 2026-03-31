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
 * PUT /api/notification-preferences/reminders/[id] — リマインダー更新（Hono Backend へプロキシ）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await createAuthToken();
  if (!token) {
    return NextResponse.json({ error: "認証エラー" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const response = await fetch(
    `${HONO_API_BASE_URL}/api/notification-preferences/reminders/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

/**
 * DELETE /api/notification-preferences/reminders/[id] — リマインダー削除（Hono Backend へプロキシ）
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await createAuthToken();
  if (!token) {
    return NextResponse.json({ error: "認証エラー" }, { status: 401 });
  }

  const { id } = await params;

  const response = await fetch(
    `${HONO_API_BASE_URL}/api/notification-preferences/reminders/${id}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
