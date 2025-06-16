import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createClient } from "@supabase/supabase-js";

// 環境変数からSupabase接続情報を取得
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
	console.error("Supabase環境変数が設定されていません");
	process.exit(1);
}

console.log("Supabase URL:", supabaseUrl);
console.log(
	"Serviceキーが設定されています:",
	supabaseServiceKey.length > 0 ? "はい" : "いいえ",
);

// Supabaseクライアントの初期化
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

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

// Supabase接続テストエンドポイント
app.get("/api/supabase-test", async (c) => {
	try {
		// Supabaseから現在の日時を取得するシンプルなクエリ
		const { data, error } = await supabase.rpc("now");

		if (error) {
			console.error("Supabase接続エラー:", error);
			return c.json(
				{
					success: false,
					error: error.message,
					details: error,
				},
				500,
			);
		}

		return c.json({
			success: true,
			message: "Supabaseに正常に接続できました",
			serverTime: data,
			timestamp: new Date().toISOString(),
		});
	} catch (err) {
		console.error("予期せぬエラー:", err);
		return c.json(
			{
				success: false,
				error: err instanceof Error ? err.message : "不明なエラー",
				details: err,
			},
			500,
		);
	}
});

// 道場一覧取得エンドポイント
app.get("/api/dojo", async (c) => {
	try {
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
		// テーブル名がuserの場合
		let { data, error } = await supabase
			.from("user")
			.select("*")
			.order("created_at", { ascending: false });

		// エラーが発生し、かつテーブル名に関するエラーの場合はusersテーブルを試す
		if (error?.message?.includes("does not exist")) {
			console.log("userテーブルが見つからないため、usersテーブルを試します");
			const result = await supabase
				.from("users")
				.select("*")
				.order("created_at", { ascending: false });

			data = result.data;
			error = result.error;
		}

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

// サーバーの起動
const port = Number(process.env.PORT) || 8787;
console.log(`🚀 Server is running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});
