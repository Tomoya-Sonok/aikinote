import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createTrainingPage } from "../lib/supabase.js";
import { createPageSchema, type ApiResponse, type PageWithTagsResponse, type PageResponse } from "../lib/validation.js";

const app = new Hono();

// ページ作成API
app.post(
	"/",
	zValidator("json", createPageSchema),
	async (c) => {
		try {
			const input = c.req.valid("json");

			// Supabaseにページを保存（実際のDB設計に合わせて修正）
			const result = await createTrainingPage(
				{
					title: input.title,
					content: input.content,
					comment: input.comment,
					user_id: input.user_id,
				},
				{
					tori: input.tori,
					uke: input.uke,
					waza: input.waza,
				}
			);

			const response: ApiResponse<PageWithTagsResponse> = {
				success: true,
				data: result,
				message: "ページが正常に作成されました",
			};

			return c.json(response, 201);
		} catch (error) {
			console.error("ページ作成エラー:", error);

			const errorResponse: ApiResponse<never> = {
				success: false,
				error: error instanceof Error ? error.message : "不明なエラーが発生しました",
			};

			return c.json(errorResponse, 500);
		}
	}
);

// ページ一覧取得API
app.get("/", async (c) => {
	try {
		const userId = c.req.query("user_id");

		if (!userId) {
			const errorResponse: ApiResponse<never> = {
				success: false,
				error: "user_idパラメータは必須です",
			};
			return c.json(errorResponse, 400);
		}

		// 開発環境では既存のモックデータ返却ロジックを使用
		// ここは既存のindex.tsの実装を参考に実装
		const response: ApiResponse<PageResponse[]> = {
			success: true,
			data: [], // 実際の実装では Supabase からデータを取得
			message: "ページ一覧を取得しました",
		};

		return c.json(response);
	} catch (error) {
		console.error("ページ一覧取得エラー:", error);

		const errorResponse: ApiResponse<never> = {
			success: false,
			error: error instanceof Error ? error.message : "不明なエラーが発生しました",
		};

		return c.json(errorResponse, 500);
	}
});

export default app;