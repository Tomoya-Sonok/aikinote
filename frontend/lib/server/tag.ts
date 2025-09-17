import { getServiceRoleSupabase } from "@/lib/supabase/server";

export type DefaultTagTemplate = {
  id: string;
  category: string;
  name: string;
  created_at: string;
};

export type UserTag = {
  id: string;
  user_id: string;
  category: string;
  name: string;
  created_at: string;
};

/**
 * DefaultTagTemplateテーブルから初期タグデータを取得する
 */
export async function getDefaultTagTemplates(): Promise<{
  data: DefaultTagTemplate[] | null;
  error: any;
}> {
  const supabase = getServiceRoleSupabase();

  const { data, error } = await supabase
    .from("DefaultTagTemplate")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return { data, error };
}

/**
 * ユーザーのタグ数を確認する（初回ログイン判定用）
 */
export async function getUserTagCount(userId: string): Promise<{
  count: number | null;
  error: any;
}> {
  const supabase = getServiceRoleSupabase();

  const { count, error } = await supabase
    .from("UserTag")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  return { count, error };
}

/**
 * DefaultTagTemplateからUserTagテーブルに初期タグを一括挿入する
 */
export async function createInitialUserTags(userId: string): Promise<{
  data: UserTag[] | null;
  error: any;
}> {
  const supabase = getServiceRoleSupabase();

  // DefaultTagTemplateから全てのテンプレートを取得
  const { data: templates, error: templatesError } = await getDefaultTagTemplates();

  if (templatesError || !templates) {
    return { data: null, error: templatesError };
  }

  // DefaultTagTemplateのデータをUserTag形式に変換
  const userTags = templates.map((template) => ({
    user_id: userId,
    category: template.category,
    name: template.name,
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
export async function initializeUserTagsIfNeeded(userId: string): Promise<{
  success: boolean;
  data?: UserTag[];
  error?: any;
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
        message: "ユーザーには既にタグが存在します"
      };
    }

    // 初期タグを作成
    const { data, error } = await createInitialUserTags(userId);

    if (error) {
      return { success: false, error };
    }

    return {
      success: true,
      data: data || [],
      message: "初期タグを作成しました"
    };
  } catch (error) {
    return { success: false, error };
  }
}