import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createClient } from "@supabase/supabase-js";
import { mockTrainingPages, mockTrainingTags } from "./types/training.js";

// 環境変数からSupabase接続情報を取得
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const isProduction = process.env.NODE_ENV === "production";

// Supabaseクライアントの初期化（本番環境のみ）
let supabase: ReturnType<typeof createClient> | null = null;
if (isProduction && supabaseUrl && supabaseServiceKey) {
	supabase = createClient(supabaseUrl, supabaseServiceKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}

// Honoアプリケーションの作成
const app = new Hono();

// ミドルウェアの設定
app.use(logger());
app.use(
	cors({
		origin: ["http://localhost:3000", "http://frontend:3000"],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		exposeHeaders: ["Content-Length"],
		maxAge: 600,
		credentials: true,
	}),
);

// ヘルスチェックエンドポイント
app.get("/health", (c) => {
	return c.json({
		status: "ok",
		message: "AikiNote API Server is running!",
		timestamp: new Date().toISOString(),
	});
});

// 道場一覧取得エンドポイント
app.get("/api/dojo", async (c) => {
	try {
		if (!supabase) {
			// 開発環境ではモックデータを返却
			return c.json({
				success: true,
				data: [],
				source: "mock",
			});
		}

		const { data, error } = await supabase
			.from("dojo")
			.select("*")
			.order("name");

		if (error) throw error;

		return c.json({ success: true, data });
	} catch (err) {
		console.error("道場取得エラー:", err);
		return c.json(
			{
				success: false,
				error: err instanceof Error ? err.message : "不明なエラー",
			},
			500,
		);
	}
});

// ユーザー一覧取得エンドポイント
app.get("/api/users", async (c) => {
	try {
		if (!supabase) {
			// 開発環境ではモックデータを返却
			return c.json({
				success: true,
				data: [],
				source: "mock",
			});
		}

		// 本番環境ではSupabaseからデータを取得
		const { data, error } = await supabase
			.from("users")
			.select("*")
			.order("created_at", { ascending: false });

		if (error) throw error;

		return c.json({ success: true, data });
	} catch (err) {
		console.error("ユーザー取得エラー:", err);
		return c.json(
			{
				success: false,
				error: err instanceof Error ? err.message : "不明なエラー",
			},
			500,
		);
	}
});

// 稽古ページ取得エンドポイント
app.get("/api/training-pages", async (c) => {
	try {
		const userId = c.req.query("user_id") || "mock-user-123";

		if (!supabase) {
			// 開発環境ではモックデータを返却
			console.log("🧪 モックデータを返却中");
			const userPages = mockTrainingPages.filter(
				(page) => page.user_id === userId,
			);
			return c.json({
				success: true,
				data: userPages,
				source: "mock",
			});
		}

		// 本番環境ではSupabaseからデータを取得
		const { data, error } = await supabase
			.from("training_pages")
			.select("*")
			.eq("user_id", userId)
			.order("date", { ascending: false });

		if (error) throw error;

		return c.json({
			success: true,
			data,
			source: "supabase",
		});
	} catch (err) {
		console.error("稽古ページ取得エラー:", err);
		return c.json(
			{
				success: false,
				error: err instanceof Error ? err.message : "不明なエラー",
			},
			500,
		);
	}
});

// 稽古タグ取得エンドポイント
app.get("/api/training-tags", async (c) => {
	try {
		if (!supabase) {
			// 開発環境ではモックデータを返却
			console.log("🧪 モック稽古タグデータを返却中");
			return c.json({
				success: true,
				data: mockTrainingTags,
				source: "mock",
			});
		}

		// 本番環境ではSupabaseからデータを取得
		const { data, error } = await supabase
			.from("training_tags")
			.select("*")
			.order("category", { ascending: true })
			.order("name", { ascending: true });

		if (error) throw error;

		return c.json({
			success: true,
			data,
			source: "supabase",
		});
	} catch (err) {
		console.error("稽古タグ取得エラー:", err);
		return c.json(
			{
				success: false,
				error: err instanceof Error ? err.message : "不明なエラー",
			},
			500,
		);
	}
});

// サーバーの起動
const port = Number(process.env.PORT) || 8787;
console.log(`🚀 Server is running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});
