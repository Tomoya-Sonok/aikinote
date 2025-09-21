import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { extractTokenFromHeader, verifyToken } from "../../lib/jwt.js";
import { createClient } from "@supabase/supabase-js";

const app = new Hono();

// 環境変数からSupabase接続情報を取得
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Supabaseクライアントの初期化
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

// プロフィール更新のスキーマ
const updateProfileSchema = z.object({
	username: z.string().min(1, "ユーザー名は必須です").optional(),
	dojo_style_name: z.string().nullable().optional(),
	training_start_date: z.string().nullable().optional(),
	profile_image_url: z.string().nullable().optional(),
});

// ユーザープロフィール取得API
app.get("/:userId", async (c) => {
	try {
		const userId = c.req.param("userId");
		const authHeader = c.req.header("Authorization");

		// JWT認証
		const token = extractTokenFromHeader(authHeader);
		const payload = verifyToken(token);

		// 本人のプロフィールのみ取得可能
		if (payload.userId !== userId) {
			return c.json(
				{
					success: false,
					error: "他のユーザーのプロフィールは取得できません",
				},
				403,
			);
		}

		// Supabaseからユーザー情報を取得
		const { data: userData, error } = await supabase
			.from("User")
			.select(
				"id, email, username, profile_image_url, dojo_style_name, training_start_date",
			)
			.eq("id", userId)
			.single();

		if (error) {
			return c.json(
				{
					success: false,
					error: "ユーザー情報の取得に失敗しました",
				},
				500,
			);
		}

		if (!userData) {
			return c.json(
				{
					success: false,
					error: "ユーザーが見つかりません",
				},
				404,
			);
		}

		return c.json({
			success: true,
			data: userData,
			message: "ユーザー情報を取得しました",
		});
	} catch (error) {
		if (
			error instanceof Error &&
			(error.message.includes("token") ||
				error.message.includes("Authorization header") ||
				error.message.includes("Invalid authorization"))
		) {
			return c.json(
				{
					success: false,
					error: "認証に失敗しました",
				},
				401,
			);
		}

		return c.json(
			{
				success: false,
				error: "サーバーエラーが発生しました",
			},
			500,
		);
	}
});

// ユーザープロフィール更新API
app.put("/:userId", zValidator("json", updateProfileSchema), async (c) => {
	try {
		const userId = c.req.param("userId");
		const authHeader = c.req.header("Authorization");
		const updateData = c.req.valid("json");

		// JWT認証
		const token = extractTokenFromHeader(authHeader);
		const payload = verifyToken(token);

		// 本人のプロフィールのみ更新可能
		if (payload.userId !== userId) {
			return c.json(
				{
					success: false,
					error: "他のユーザーのプロフィールは更新できません",
				},
				403,
			);
		}

		// ユーザー名のバリデーション（簡易版）
		if (updateData.username && updateData.username.length > 20) {
			return c.json(
				{
					success: false,
					error: "ユーザー名は20文字以内で入力してください",
				},
				400,
			);
		}

		// Supabaseでユーザー情報を更新
		const { data: updatedUser, error: updateError } = await supabase
			.from("User")
			.update(updateData)
			.eq("id", userId)
			.select(
				"id, email, username, profile_image_url, dojo_style_name, training_start_date",
			)
			.single();

		if (updateError) {
			return c.json(
				{
					success: false,
					error: "プロフィールの更新に失敗しました",
				},
				500,
			);
		}

		return c.json({
			success: true,
			data: updatedUser,
			message: "プロフィールを更新しました",
		});
	} catch (error) {
		if (
			error instanceof Error &&
			(error.message.includes("token") ||
				error.message.includes("Authorization header") ||
				error.message.includes("Invalid authorization"))
		) {
			return c.json(
				{
					success: false,
					error: "認証に失敗しました",
				},
				401,
			);
		}

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
