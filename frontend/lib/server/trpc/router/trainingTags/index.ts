import { getServiceRoleSupabase } from "@/lib/supabase/server";
import { publicProcedure, router } from "@/server/trpc";
import { z } from "zod";

export const trainingTagsRouter = router({
	getAllTags: publicProcedure.query(async () => {
		const supabase = getServiceRoleSupabase();
		const { data: tags, error } = await supabase.from("tag").select("*");

		if (error) {
			throw new Error(`Failed to fetch tags: ${error.message}`);
		}

		return tags;
	}),
	postNewTag: publicProcedure
		.input(
			z.object({
				name: z
					.string()
					.min(1, "タグ名は必須です")
					.max(20, "タグ名は20文字以内で入力してください")
					.regex(/^[a-zA-Z0-9ぁ-んァ-ンー一-龠０-９]+$/, "タグ名は全角・半角英数字のみ使用可能です"),
				category: z.enum(["取り", "受け", "技"], {
					errorMap: () => ({ message: "カテゴリは「取り」「受け」「技」のいずれかを選択してください" }),
				}),
			}),
		)
		.mutation(async ({ input }) => {
			const supabase = getServiceRoleSupabase();

			const { data: existingTag, error: checkError } = await supabase
				.from("tag")
				.select("*")
				.eq("name", input.name)
				.eq("category", input.category)
				.single();

			if (checkError && checkError.code !== "PGRST116") {
				throw new Error(`Failed to check existing tag: ${checkError.message}`);
			}

			if (existingTag) {
				throw new Error("同じ名前とカテゴリのタグが既に存在します");
			}

			const { data: newTag, error } = await supabase
				.from("tag")
				.insert([{ name: input.name, category: input.category }])
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to create tag: ${error.message}`);
			}

			return newTag;
		}),
});
