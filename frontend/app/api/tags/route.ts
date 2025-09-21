import { Hono } from "hono";
import { handle } from "hono/vercel";

import { getServiceRoleSupabase } from "@/lib/supabase/server";

// 開発環境用のモックデータ
const MOCK_USER_ID = "ec40977c-1de8-4784-ac78-e3ff3a5cb915";
const mockUserTags: Array<{
	id: string;
	user_id: string;
	category: string;
	name: string;
	created_at: string;
}> = [];

// 開発環境の判定
const isDevelopment = process.env.NODE_ENV === "development";

const app = new Hono().basePath("/api");

app.get("/tags", async (c) => {
	const userId = c.req.query("user_id");

	if (!userId) {
		return c.json({ error: "user_idが必要です" }, 400);
	}

	// 開発環境でモックユーザーの場合はモックデータを返す
	if (isDevelopment && userId === MOCK_USER_ID) {
		const sortedTags = [...mockUserTags].sort((a, b) => {
			if (a.category !== b.category) {
				return a.category.localeCompare(b.category);
			}
			return a.name.localeCompare(b.name);
		});
		return c.json({ success: true, data: sortedTags });
	}

	const supabase = getServiceRoleSupabase();
	const { data: tags, error } = await supabase
		.from("UserTag")
		.select("*")
		.eq("user_id", userId)
		.order("category", { ascending: true })
		.order("name", { ascending: true });

	if (error) {
		console.error(error);
		return c.json(
			{ success: false, error: "データベースの取得に失敗しました" },
			500,
		);
	}

	return c.json({ success: true, data: tags });
});

app.post("/tags", async (c) => {
	const body = await c.req.json();
	const { name, category, user_id } = body;

	if (!name || !category || !user_id) {
		return c.json(
			{ success: false, error: "必要なパラメータが不足しています" },
			400,
		);
	}

	// 開発環境でモックユーザーの場合はモックデータで処理
	if (isDevelopment && user_id === MOCK_USER_ID) {
		const newTag = {
			id: `mock-tag-${Date.now()}`,
			user_id: user_id,
			category: category,
			name: name,
			created_at: new Date().toISOString(),
		};

		mockUserTags.push(newTag);
		return c.json({ success: true, data: newTag });
	}

	const supabase = getServiceRoleSupabase();
	const { data: tag, error } = await supabase
		.from("UserTag")
		.insert({ name, category, user_id })
		.select("*")
		.single();

	if (error) {
		console.error(error);
		return c.json({ success: false, error: "タグの作成に失敗しました" }, 500);
	}

	return c.json({ success: true, data: tag });
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);

export type ApiRoutes = typeof app;
