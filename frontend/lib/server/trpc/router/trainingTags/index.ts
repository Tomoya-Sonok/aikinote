import { getServiceRoleSupabase } from "@/lib/supabase/server";
import { publicProcedure, router } from "@/server/trpc";

export const trainingTagsRouter = router({
	getAllTags: publicProcedure.query(async () => {
		const supabase = getServiceRoleSupabase();
		const { data: tags, error } = await supabase.from("tag").select("*");

		if (error) {
			throw new Error(`Failed to fetch tags: ${error.message}`);
		}

		return tags;
	}),
});
