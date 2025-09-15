import { Hono } from "hono";
import { handle } from "hono/vercel";

import { getServiceRoleSupabase } from "@/lib/supabase/server";

const app = new Hono().basePath("/api");

app.get("/tags", async (c) => {
  const supabase = getServiceRoleSupabase();
  const { data: tags, error } = await supabase.from("tags").select("*");

  if (error) {
    console.error(error); // エラーをサーバーログに出力
    return c.json({ error: "データベースの取得に失敗しました" }, 500);
  }
  return c.json(tags);
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);

export type ApiRoutes = typeof app;
