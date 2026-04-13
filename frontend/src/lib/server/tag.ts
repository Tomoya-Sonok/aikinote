import { PostgrestError } from "@supabase/supabase-js";
import {
  DEFAULT_CATEGORIES,
  INITIAL_USER_TAGS,
  type TagLanguage,
} from "@/constants/tags";
import { getServiceRoleSupabase } from "@/lib/supabase/server";

export type UserTag = {
  id: string;
  user_id: string;
  category: string;
  name: string;
  created_at: string;
  sort_order?: number;
};

/**
 * ユーザーのタグ数を確認する（初回ログイン判定用）
 */
export async function getUserTagCount(userId: string): Promise<{
  count: number | null;
  error: PostgrestError | null;
}> {
  const supabase = getServiceRoleSupabase();

  const { count, error } = await supabase
    .from("UserTag")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  return { count, error };
}

/**
 * 定数定義からUserTagテーブルに初期タグを一括挿入する
 */
export async function createInitialUserTags(
  userId: string,
  language: TagLanguage = "ja",
): Promise<{
  data: UserTag[] | null;
  error: PostgrestError | null;
}> {
  const supabase = getServiceRoleSupabase();

  // 選択された言語のタグ定義をUserTag形式に変換
  const userTags = INITIAL_USER_TAGS[language].map((tag, index) => ({
    user_id: userId,
    category: tag.category,
    name: tag.name,
    sort_order: index + 1, // DBの制約(positive)を満たすために設定
  }));

  // UserTagテーブルに一括挿入
  const { data, error } = await supabase
    .from("UserTag")
    .insert(userTags)
    .select("*");

  return { data, error };
}

/**
 * 初回ログイン時の初期タグ作成処理
 * ユーザーのタグが存在しない場合のみ実行
 */
export async function initializeUserTagsIfNeeded(
  userId: string,
  language: TagLanguage = "ja",
): Promise<{
  success: boolean;
  data?: UserTag[];
  error?: PostgrestError | null;
  message?: string;
}> {
  try {
    // ユーザーの既存タグ数を確認
    const { count, error: countError } = await getUserTagCount(userId);

    if (countError) {
      return { success: false, error: countError };
    }

    // 既にタグが存在する場合は何もしない
    if (count && count > 0) {
      return {
        success: true,
        message: "ユーザーには既にタグが存在します",
      };
    }

    // デフォルトカテゴリを作成
    const supabase = getServiceRoleSupabase();
    await supabase.from("UserCategory").upsert(
      DEFAULT_CATEGORIES.map((d) => ({
        user_id: userId,
        name: d.name,
        slug: d.slug,
        sort_order: d.sort_order,
        is_default: true,
      })),
      { onConflict: "user_id,name" },
    );

    // 初期タグを作成
    const { data, error } = await createInitialUserTags(userId, language);

    if (error) {
      return { success: false, error };
    }

    return {
      success: true,
      data: data || [],
      message: "初期タグを作成しました",
    };
  } catch (error) {
    return { success: false, error: error as PostgrestError };
  }
}
