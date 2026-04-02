import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type Context, Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";

type DojoStyleBindings = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  JWT_SECRET?: string;
};

type DojoStyleVariables = {
  supabase: SupabaseClient | null;
  userId: string;
};

const app = new Hono<{
  Bindings: DojoStyleBindings;
  Variables: DojoStyleVariables;
}>();

let supabaseForDojoStyles: SupabaseClient | null = null;

const resolveSupabaseClient = (
  c: Context<{ Bindings: DojoStyleBindings; Variables: DojoStyleVariables }>,
): SupabaseClient | null => {
  const supabaseFromContext = c.get("supabase");
  if (supabaseFromContext) {
    return supabaseFromContext;
  }

  if (supabaseForDojoStyles) {
    return supabaseForDojoStyles;
  }

  const supabaseUrl =
    c.env?.SUPABASE_URL ??
    (typeof process !== "undefined" ? process.env?.SUPABASE_URL : undefined) ??
    "";
  const supabaseServiceKey =
    c.env?.SUPABASE_SERVICE_ROLE_KEY ??
    (typeof process !== "undefined"
      ? process.env?.SUPABASE_SERVICE_ROLE_KEY
      : undefined) ??
    "";

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  supabaseForDojoStyles = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseForDojoStyles;
};

const searchQuerySchema = z.object({
  query: z.string().min(1, "検索クエリは必須です"),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const createDojoStyleSchema = z.object({
  dojo_name: z.string().min(1, "道場名は必須です").max(100),
  dojo_name_kana: z.string().optional(),
});

// 道場検索API（公開）
app.get("/search", async (c) => {
  try {
    const rawQuery = c.req.query("query") ?? "";
    const rawLimit = c.req.query("limit");

    const parsed = searchQuerySchema.safeParse({
      query: rawQuery,
      ...(rawLimit != null && { limit: rawLimit }),
    });

    if (!parsed.success) {
      return c.json(
        {
          success: false,
          error: "検索パラメータが不正です",
        },
        400,
      );
    }

    const { query, limit } = parsed.data;

    const supabase = resolveSupabaseClient(c);
    if (!supabase) {
      return c.json(
        {
          success: false,
          error: "サーバー設定が不正です",
        },
        500,
      );
    }

    const pattern = `%${query}%`;

    let queryBuilder = supabase
      .from("DojoStyleMaster")
      .select("id, dojo_name, dojo_name_kana, is_approved")
      .eq("is_approved", true)
      .or(`dojo_name.ilike.${pattern},dojo_name_kana.ilike.${pattern}`);

    if (limit != null) {
      queryBuilder = queryBuilder.limit(limit);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      return c.json(
        {
          success: false,
          error: "検索に失敗しました",
        },
        500,
      );
    }

    return c.json({
      success: true,
      data: data ?? [],
    });
  } catch (_error) {
    return c.json(
      {
        success: false,
        error: "サーバーエラーが発生しました",
      },
      500,
    );
  }
});

// 道場新規登録API（認証必須）
app.post("/", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        {
          success: false,
          error: "リクエストの形式が正しくありません",
        },
        400,
      );
    }

    const parsed = createDojoStyleSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          success: false,
          error: "入力内容に誤りがあります",
        },
        400,
      );
    }

    const { dojo_name, dojo_name_kana } = parsed.data;

    const supabase = c.get("supabase")!;

    // 既存の完全一致チェック
    const { data: existing, error: searchError } = await supabase
      .from("DojoStyleMaster")
      .select("id, dojo_name, is_approved")
      .eq("dojo_name", dojo_name)
      .maybeSingle();

    if (searchError) {
      return c.json(
        {
          success: false,
          error: "検索に失敗しました",
        },
        500,
      );
    }

    // 既存レコードがあればそのIDを返す
    if (existing) {
      return c.json({
        success: true,
        data: existing,
        message: "既存の道場情報を返却しました",
      });
    }

    // 新規作成（未承認）
    const { data: created, error: insertError } = await supabase
      .from("DojoStyleMaster")
      .insert({
        dojo_name,
        dojo_name_kana: dojo_name_kana || null,
        is_approved: false,
        created_by_user_id: userId,
      })
      .select("id, dojo_name, is_approved")
      .single();

    if (insertError) {
      // UNIQUE制約違反の場合（レースコンディション対応）
      if (
        insertError.message.includes("duplicate") ||
        insertError.message.includes("unique")
      ) {
        const { data: retryData } = await supabase
          .from("DojoStyleMaster")
          .select("id, dojo_name, is_approved")
          .eq("dojo_name", dojo_name)
          .single();

        if (retryData) {
          return c.json({
            success: true,
            data: retryData,
            message: "既存の道場情報を返却しました",
          });
        }
      }

      return c.json(
        {
          success: false,
          error: "道場の登録に失敗しました",
        },
        500,
      );
    }

    return c.json(
      {
        success: true,
        data: created,
        message: "道場を登録しました",
      },
      201,
    );
  } catch (_error) {
    return c.json(
      {
        success: false,
        error: "サーバーエラーが発生しました",
      },
      500,
    );
  }
});

export default app;
