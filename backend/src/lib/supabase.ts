import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// biome-ignore lint/suspicious/noExplicitAny: simplified type
let supabase!: SupabaseClient<any>;

// 環境変数からSupabase接続情報を取得（Node.js用の初期化）
const supabaseUrl =
  typeof process !== "undefined" ? process.env?.SUPABASE_URL : undefined;
const supabaseServiceKey =
  typeof process !== "undefined"
    ? process.env?.SUPABASE_SERVICE_ROLE_KEY
    : undefined;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// biome-ignore lint/suspicious/noExplicitAny: simplified type
export const setSupabaseClient = (client: SupabaseClient<any>): void => {
  supabase = client;
};

export { supabase };

// 実際のDB設計に基づくデータベース型定義
export interface TrainingPageRow {
  id: string; // uuid
  user_id: string; // uuid FK
  title: string; // text
  content: string; // text
  comment: string; // text
  created_at: string; // timestamp
  updated_at: string; // timestamp
}

export interface UserTagRow {
  id: string; // uuid PK
  user_id: string; // uuid FK
  name: string; // text
  category: string; // text (取り、受け、技)
  created_at: string; // timestamp
  sort_order: number | null; // 並び順（カテゴリ内）
}

export interface TrainingPageTagRow {
  id: string; // uuid PK
  training_page_id: string; // uuid FK
  user_tag_id: string; // uuid FK
}

export interface TrainingDateRow {
  id: string; // uuid PK
  user_id: string; // uuid FK
  training_date: string; // date
  is_attended: boolean; // 参加有無
  created_at: string; // timestamp
}

export interface TrainingDatePageCount {
  training_date: string; // date
  page_count: number;
}

// データベース操作関数
export const createTrainingPage = async (
  pageData: Omit<TrainingPageRow, "id" | "created_at" | "updated_at"> & {
    created_at?: string;
  },
  tagNames: { tori: string[]; uke: string[]; waza: string[] },
): Promise<{ page: TrainingPageRow; tags: UserTagRow[] }> => {
  // トランザクションを使用してページと関連タグを作成
  try {
    // 1. TrainingPageを作成
    const insertPageData = pageData.created_at
      ? {
          title: pageData.title,
          content: pageData.content,
          comment: pageData.comment,
          user_id: pageData.user_id,
          created_at: pageData.created_at,
        }
      : {
          title: pageData.title,
          content: pageData.content,
          comment: pageData.comment,
          user_id: pageData.user_id,
        };

    const { data: newPage, error: pageError } = await supabase
      .from("TrainingPage")
      .insert([insertPageData])
      .select("*")
      .single();

    if (pageError) {
      throw new Error(`ページの作成に失敗しました: ${pageError.message}`);
    }

    // 2. すべてのタグ名を統合してカテゴリ付きで配列化
    const categories = [
      ...tagNames.tori.map((name) => ({ name, category: "取り" })),
      ...tagNames.uke.map((name) => ({ name, category: "受け" })),
      ...tagNames.waza.map((name) => ({ name, category: "技" })),
    ];

    const associatedTags: UserTagRow[] = [];
    const trainingPageTags: Omit<TrainingPageTagRow, "id">[] = [];

    // 3. 各タグを処理
    for (const { name, category } of categories) {
      // 既存のタグをチェック
      const { data: existingTag } = await supabase
        .from("UserTag")
        .select("*")
        .eq("user_id", pageData.user_id)
        .eq("name", name)
        .eq("category", category)
        .single();

      let tagId: string;

      if (existingTag) {
        // 既存のタグを使用
        tagId = existingTag.id;
        associatedTags.push(existingTag);
      } else {
        // 新しいタグを作成
        const { data: newTag, error: tagError } = await supabase
          .from("UserTag")
          .insert([
            {
              user_id: pageData.user_id,
              name,
              category,
              created_at: new Date().toISOString(),
            },
          ])
          .select("*")
          .single();

        if (tagError) {
          throw new Error(`タグの作成に失敗しました: ${tagError.message}`);
        }

        tagId = newTag.id;
        associatedTags.push(newTag);
      }

      // TrainingPageTagのリレーションを準備
      trainingPageTags.push({
        training_page_id: newPage.id,
        user_tag_id: tagId,
      });
    }

    // 4. TrainingPageTagのリレーションを作成
    if (trainingPageTags.length > 0) {
      const { error: relationError } = await supabase
        .from("TrainingPageTag")
        .insert(trainingPageTags);

      if (relationError) {
        throw new Error(`タグ関連付けに失敗しました: ${relationError.message}`);
      }
    }

    return { page: newPage, tags: associatedTags };
  } catch (error) {
    console.error("TrainingPage作成エラー:", error);
    throw error;
  }
};

// ページ一覧取得関数
export const getTrainingPages = async ({
  userId,
  limit = 20,
  offset = 0,
  query,
  tags: tagsString,
  startDate,
  endDate,
  date,
  sortOrder = "newest",
}: {
  userId: string;
  limit?: number;
  offset?: number;
  query?: string;
  tags?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  sortOrder?: "newest" | "oldest";
}): Promise<{
  pages: { page: TrainingPageRow; tags: UserTagRow[] }[];
  totalCount: number;
}> => {
  try {
    let pageIds: string[] | null = null;

    // タグによる絞り込み（AND検索）
    if (tagsString) {
      const tagNames = tagsString.split(",");

      // 1. タグ名からタグIDを検索
      const { data: tagIdsData, error: tagIdsError } = await supabase
        .from("UserTag")
        .select("id")
        .in("name", tagNames)
        .eq("user_id", userId);

      if (tagIdsError) throw new Error("タグIDの検索に失敗しました");

      // 検索したタグの数が一致しない場合、結果は0件
      if (tagIdsData.length !== tagNames.length) {
        return { pages: [], totalCount: 0 };
      }
      const tagIds = tagIdsData.map((t) => t.id);

      // 2. 全てのタグIDを持つtraining_page_idを検索
      const { data: pageTags, error: pageTagsError } = await supabase
        .from("TrainingPageTag")
        .select("training_page_id")
        .in("user_tag_id", tagIds);

      if (pageTagsError)
        throw new Error("ページとタグの関連検索に失敗しました");

      if (pageTags) {
        // ページIDごとにタグ数をカウントして、全てのタグを持つページのみを抽出
        const pageTagCounts: { [key: string]: number } = {};
        pageTags.forEach((pt: { training_page_id: string }) => {
          pageTagCounts[pt.training_page_id] =
            (pageTagCounts[pt.training_page_id] || 0) + 1;
        });

        pageIds = Object.entries(pageTagCounts)
          .filter(([, count]) => count === tagIds.length)
          .map(([pageId]) => pageId);
      } else {
        pageIds = [];
      }

      // 一致するページがない場合は空配列を返す
      if (!pageIds || pageIds.length === 0) {
        return { pages: [], totalCount: 0 };
      }
    }

    // ページ取得のベースクエリ
    let queryBuilder = supabase
      .from("TrainingPage")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    // フリーワード検索
    if (query) {
      queryBuilder = queryBuilder.ilike("title", `%${query}%`);
    }

    const filters: { gte?: string; lte?: string } = {};
    if (startDate) {
      filters.gte = `${startDate}T00:00:00Z`;
    }
    if (endDate) {
      filters.lte = `${endDate}T23:59:59Z`;
    }
    if (!startDate && !endDate && date) {
      filters.gte = `${date}T00:00:00Z`;
      filters.lte = `${date}T23:59:59Z`;
    }

    if (filters.gte) {
      queryBuilder = queryBuilder.gte("created_at", filters.gte);
    }
    if (filters.lte) {
      queryBuilder = queryBuilder.lte("created_at", filters.lte);
    }

    // タグ検索結果で絞り込み
    if (pageIds) {
      queryBuilder = queryBuilder.in("id", pageIds);
    }

    // ページネーションと順序付け
    const {
      data: pages,
      count,
      error: pagesError,
    } = await queryBuilder
      .order("created_at", { ascending: sortOrder === "oldest" })
      .range(offset, offset + limit - 1);

    if (pagesError) {
      throw new Error(`ページの取得に失敗しました: ${pagesError.message}`);
    }

    if (!pages || pages.length === 0) {
      return { pages: [], totalCount: count ?? 0 };
    }

    // 各ページに関連するタグを取得（TODO: N+1問題は残存している、要対応）
    const pagesWithTags: { page: TrainingPageRow; tags: UserTagRow[] }[] = [];
    for (const page of pages) {
      const { data: pageTags, error: tagsError } = await supabase
        .from("TrainingPageTag")
        .select("UserTag(*)")
        .eq("training_page_id", page.id);

      if (tagsError) {
        console.error(`ページ ${page.id} のタグ取得エラー:`, tagsError);
        pagesWithTags.push({ page, tags: [] });
        continue;
      }

      const tags: UserTagRow[] =
        pageTags
          ?.map((pt: { UserTag: UserTagRow | UserTagRow[] }) => {
            // UserTagが配列の場合は最初の要素を取得、そうでなければそのまま返す
            return Array.isArray(pt.UserTag) ? pt.UserTag[0] : pt.UserTag;
          })
          .filter(Boolean) || [];
      pagesWithTags.push({ page, tags });
    }

    return { pages: pagesWithTags, totalCount: count ?? 0 };
  } catch (error) {
    console.error("TrainingPages取得エラー:", error);
    throw error;
  }
};

const buildMonthRange = (
  year: number,
  month: number,
): { startDate: string; endDate: string } => {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { startDate, endDate };
};

export const getTrainingDatesByMonth = async (
  userId: string,
  year: number,
  month: number,
): Promise<TrainingDateRow[]> => {
  const { startDate, endDate } = buildMonthRange(year, month);

  const { data, error } = await supabase
    .from("TrainingDate")
    .select("*")
    .eq("user_id", userId)
    .gte("training_date", startDate)
    .lte("training_date", endDate)
    .order("training_date", { ascending: true });

  if (error) {
    throw new Error(`稽古参加日の取得に失敗しました: ${error.message}`);
  }

  return data ?? [];
};

export const upsertTrainingDateAttendance = async (
  userId: string,
  trainingDate: string,
): Promise<TrainingDateRow> => {
  const { data, error } = await supabase
    .from("TrainingDate")
    .upsert(
      [
        {
          user_id: userId,
          training_date: trainingDate,
          is_attended: true,
        },
      ],
      {
        onConflict: "user_id,training_date",
      },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(`稽古参加日の保存に失敗しました: ${error.message}`);
  }

  return data;
};

export const deleteTrainingDateAttendance = async (
  userId: string,
  trainingDate: string,
): Promise<void> => {
  const { error } = await supabase
    .from("TrainingDate")
    .delete()
    .eq("user_id", userId)
    .eq("training_date", trainingDate);

  if (error) {
    throw new Error(`稽古参加日の削除に失敗しました: ${error.message}`);
  }
};

export const getTrainingPageCountsByMonth = async (
  userId: string,
  year: number,
  month: number,
): Promise<TrainingDatePageCount[]> => {
  const { startDate, endDate } = buildMonthRange(year, month);

  const { data, error } = await supabase
    .from("TrainingPage")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", `${startDate}T00:00:00Z`)
    .lte("created_at", `${endDate}T23:59:59Z`);

  if (error) {
    throw new Error(`ページ件数の取得に失敗しました: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  const countByDate = new Map<string, number>();

  for (const row of data) {
    const createdAt = row.created_at as string | undefined;
    if (!createdAt) {
      continue;
    }
    const dateKey = createdAt.slice(0, 10);
    countByDate.set(dateKey, (countByDate.get(dateKey) ?? 0) + 1);
  }

  return Array.from(countByDate.entries())
    .map(([training_date, page_count]) => ({
      training_date,
      page_count,
    }))
    .sort((a, b) => a.training_date.localeCompare(b.training_date));
};

// タグ一覧取得関数
export const getUserTags = async (userId: string): Promise<UserTagRow[]> => {
  const { data: tags, error } = await supabase
    .from("UserTag")
    .select("*")
    .eq("user_id", userId)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`タグ取得に失敗しました: ${error.message}`);
  }

  return tags || [];
};

// 重複タグチェック関数
export const checkDuplicateTag = async (
  userId: string,
  name: string,
  category: string,
): Promise<UserTagRow | null> => {
  const { data: existingTag, error } = await supabase
    .from("UserTag")
    .select("*")
    .eq("user_id", userId)
    .eq("name", name)
    .eq("category", category)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`既存タグチェックに失敗しました: ${error.message}`);
  }

  return existingTag;
};

// タグ作成関数
const resolveNextSortOrder = async (
  userId: string,
  category: string,
): Promise<number> => {
  const { data: existingOrders, error } = await supabase
    .from("UserTag")
    .select("sort_order")
    .eq("user_id", userId)
    .eq("category", category);

  if (error) {
    throw new Error(`並び順情報の取得に失敗しました: ${error.message}`);
  }

  const rows = (existingOrders ?? []).filter(
    (row): row is { sort_order: number | null } => row !== null,
  );

  const numericOrders = rows
    .map((row) => row.sort_order)
    .filter((value): value is number => typeof value === "number");

  if (numericOrders.length === 0) {
    return 1;
  }

  const maxSortOrder = Math.max(...numericOrders);
  return maxSortOrder >= 1 ? maxSortOrder + 1 : 1;
};

export const createUserTag = async (
  userId: string,
  name: string,
  category: string,
): Promise<UserTagRow> => {
  const nextSortOrder = await resolveNextSortOrder(userId, category);

  const { data: newTag, error } = await supabase
    .from("UserTag")
    .insert([
      {
        user_id: userId,
        name,
        category,
        created_at: new Date().toISOString(),
        sort_order: nextSortOrder,
      },
    ])
    .select("*")
    .single();

  if (error) {
    throw new Error(`タグ作成に失敗しました: ${error.message}`);
  }

  return newTag;
};

interface TagOrderUpdate {
  id: string;
  category: string;
  sort_order: number;
}

export const updateUserTagOrder = async (
  userId: string,
  updates: TagOrderUpdate[],
): Promise<UserTagRow[]> => {
  if (updates.length === 0) {
    return [];
  }

  const { data: userTags, error: fetchError } = await supabase
    .from("UserTag")
    .select("id, category, user_id, name, created_at, sort_order")
    .eq("user_id", userId);

  if (fetchError) {
    throw new Error(`タグ情報の取得に失敗しました: ${fetchError.message}`);
  }

  if (!userTags) {
    throw new Error("指定されたタグが見つかりません");
  }

  const userTagMap = new Map(userTags.map((tag) => [tag.id, tag]));

  if (updates.some((update) => !userTagMap.has(update.id))) {
    throw new Error("指定されたタグが見つかりません");
  }

  const categoryMap = new Map(userTags.map((tag) => [tag.id, tag.category]));

  for (const update of updates) {
    const category = categoryMap.get(update.id);
    if (!category) {
      throw new Error("指定されたタグが見つかりません");
    }

    if (category !== update.category) {
      throw new Error("カテゴリが一致しないタグが含まれています");
    }
  }

  const categoryUpdatesMap = new Map<string, TagOrderUpdate[]>();

  for (const update of updates) {
    const list = categoryUpdatesMap.get(update.category) ?? [];
    list.push(update);
    categoryUpdatesMap.set(update.category, list);
  }

  const existingByCategory = new Map<
    string,
    Array<{ id: string; name: string; sort_order: number | null }>
  >();

  for (const tag of userTags) {
    const list = existingByCategory.get(tag.category) ?? [];
    list.push({
      id: tag.id,
      name: tag.name,
      sort_order: tag.sort_order,
    });
    existingByCategory.set(tag.category, list);
  }

  const normalizedUpdates: TagOrderUpdate[] = [];

  const sortedCategories = Array.from(categoryUpdatesMap.keys()).sort();

  for (const category of sortedCategories) {
    const categoryUpdates = categoryUpdatesMap.get(category);
    if (!categoryUpdates) {
      continue;
    }
    const orderedUpdates = [...categoryUpdates].sort(
      (a, b) => a.sort_order - b.sort_order,
    );

    const desiredIds = orderedUpdates.map((update) => update.id);
    const desiredSet = new Set(desiredIds);

    const existing = existingByCategory.get(category) ?? [];
    const sortedExisting = existing.slice().sort((a, b) => {
      const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.name.localeCompare(b.name, "ja");
    });

    for (const tag of sortedExisting) {
      if (!desiredSet.has(tag.id)) {
        desiredIds.push(tag.id);
      }
    }

    desiredIds.forEach((id, index) => {
      normalizedUpdates.push({
        id,
        category,
        sort_order: index + 1,
      });
    });
  }

  if (normalizedUpdates.length === 0) {
    return userTags;
  }

  const temporaryOffset = 100000;

  const applyUpdates = async (
    orderUpdates: Array<{ id: string; sort_order: number }>,
  ) => {
    for (const update of orderUpdates) {
      const { error } = await supabase
        .from("UserTag")
        .update({ sort_order: update.sort_order })
        .eq("id", update.id)
        .eq("user_id", userId);

      if (error) {
        throw new Error(`タグ並び順の更新に失敗しました: ${error.message}`);
      }
    }
  };

  await applyUpdates(
    normalizedUpdates.map(({ id }, index) => ({
      id,
      sort_order: temporaryOffset + index,
    })),
  );

  await applyUpdates(
    normalizedUpdates.map(({ id, sort_order }) => ({
      id,
      sort_order,
    })),
  );

  const { data: updatedTags, error: refetchError } = await supabase
    .from("UserTag")
    .select("*")
    .eq("user_id", userId);

  if (refetchError) {
    throw new Error(`タグ情報の再取得に失敗しました: ${refetchError.message}`);
  }

  return updatedTags ?? [];
};

export const deleteUserTag = async (
  tagId: string,
  userId: string,
): Promise<UserTagRow | null> => {
  const { data: targetTag, error: fetchError } = await supabase
    .from("UserTag")
    .select("*")
    .eq("id", tagId)
    .eq("user_id", userId)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      return null;
    }

    throw new Error(`タグ取得に失敗しました: ${fetchError.message}`);
  }

  const { error: detachError } = await supabase
    .from("TrainingPageTag")
    .delete()
    .eq("user_tag_id", tagId);

  if (detachError) {
    throw new Error(`タグ関連付け削除に失敗しました: ${detachError.message}`);
  }

  const { error: deleteError } = await supabase
    .from("UserTag")
    .delete()
    .eq("id", tagId)
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(`タグ削除に失敗しました: ${deleteError.message}`);
  }

  return targetTag ?? null;
};

// ページ詳細取得関数
export const getTrainingPageById = async (
  pageId: string,
  userId: string,
): Promise<{ page: TrainingPageRow; tags: UserTagRow[] }> => {
  try {
    // 1. ページの存在確認と権限チェック
    const { data: page, error: pageError } = await supabase
      .from("TrainingPage")
      .select("*")
      .eq("id", pageId)
      .eq("user_id", userId)
      .single();

    if (pageError || !page) {
      throw new Error("ページが見つからないか、アクセス権限がありません");
    }

    // 2. ページに関連するタグを取得
    const { data: pageTags, error: tagsError } = await supabase
      .from("TrainingPageTag")
      .select("UserTag(*)")
      .eq("training_page_id", pageId);

    if (tagsError) {
      console.error(`ページ ${pageId} のタグ取得エラー:`, tagsError);
      return { page, tags: [] };
    }

    const tags: UserTagRow[] =
      pageTags
        ?.map((pt: { UserTag: UserTagRow | UserTagRow[] }) => {
          // UserTagが配列の場合は最初の要素を取得、そうでなければそのまま返す
          return Array.isArray(pt.UserTag) ? pt.UserTag[0] : pt.UserTag;
        })
        .filter(Boolean) || [];

    return { page, tags };
  } catch (error) {
    console.error("TrainingPage詳細取得エラー:", error);
    throw error;
  }
};

// ページ更新関数
export const updateTrainingPage = async (
  pageData: Omit<TrainingPageRow, "created_at" | "updated_at"> & { id: string },
  tagNames: { tori: string[]; uke: string[]; waza: string[] },
): Promise<{ page: TrainingPageRow; tags: UserTagRow[] }> => {
  try {
    // 1. ページの存在確認と権限チェック
    const { data: existingPage, error: pageCheckError } = await supabase
      .from("TrainingPage")
      .select("*")
      .eq("id", pageData.id)
      .eq("user_id", pageData.user_id)
      .single();

    if (pageCheckError || !existingPage) {
      throw new Error("ページが見つからないか、編集権限がありません");
    }

    // 2. TrainingPageを更新
    const { data: updatedPage, error: pageError } = await supabase
      .from("TrainingPage")
      .update({
        title: pageData.title,
        content: pageData.content,
        comment: pageData.comment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pageData.id)
      .eq("user_id", pageData.user_id)
      .select("*")
      .single();

    if (pageError) {
      throw new Error(`ページの更新に失敗しました: ${pageError.message}`);
    }

    // 3. 既存のタグ関連付けを削除
    const { error: deleteTagsError } = await supabase
      .from("TrainingPageTag")
      .delete()
      .eq("training_page_id", pageData.id);

    if (deleteTagsError) {
      throw new Error(
        `既存のタグ関連付け削除に失敗しました: ${deleteTagsError.message}`,
      );
    }

    // 4. 新しいタグを処理（createTrainingPageと同じロジック）
    const categories = [
      ...tagNames.tori.map((name) => ({ name, category: "取り" })),
      ...tagNames.uke.map((name) => ({ name, category: "受け" })),
      ...tagNames.waza.map((name) => ({ name, category: "技" })),
    ];

    const associatedTags: UserTagRow[] = [];
    const trainingPageTags: Omit<TrainingPageTagRow, "id">[] = [];

    // 5. 各タグを処理
    for (const { name, category } of categories) {
      // 既存のタグをチェック
      const { data: existingTag } = await supabase
        .from("UserTag")
        .select("*")
        .eq("user_id", pageData.user_id)
        .eq("name", name)
        .eq("category", category)
        .single();

      let tagId: string;

      if (existingTag) {
        // 既存のタグを使用
        tagId = existingTag.id;
        associatedTags.push(existingTag);
      } else {
        // 新しいタグを作成
        const { data: newTag, error: tagError } = await supabase
          .from("UserTag")
          .insert([
            {
              user_id: pageData.user_id,
              name,
              category,
              created_at: new Date().toISOString(),
            },
          ])
          .select("*")
          .single();

        if (tagError) {
          throw new Error(`タグの作成に失敗しました: ${tagError.message}`);
        }

        tagId = newTag.id;
        associatedTags.push(newTag);
      }

      // TrainingPageTagのリレーションを準備
      trainingPageTags.push({
        training_page_id: updatedPage.id,
        user_tag_id: tagId,
      });
    }

    // 6. TrainingPageTagのリレーションを作成
    if (trainingPageTags.length > 0) {
      const { error: relationError } = await supabase
        .from("TrainingPageTag")
        .insert(trainingPageTags);

      if (relationError) {
        throw new Error(`タグ関連付けに失敗しました: ${relationError.message}`);
      }
    }

    return { page: updatedPage, tags: associatedTags };
  } catch (error) {
    console.error("TrainingPage更新エラー:", error);
    throw error;
  }
};

// ページ削除関数
export const deleteTrainingPage = async (
  pageId: string,
  userId: string,
): Promise<void> => {
  try {
    // 対象ページの存在確認と権限チェック
    const { data: existingPage, error: fetchError } = await supabase
      .from("TrainingPage")
      .select("id")
      .eq("id", pageId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !existingPage) {
      throw new Error("ページが見つからないか、削除権限がありません");
    }

    // 関連するタグ紐付けの削除
    const { error: deleteRelationsError } = await supabase
      .from("TrainingPageTag")
      .delete()
      .eq("training_page_id", pageId);

    if (deleteRelationsError) {
      throw new Error(
        `タグ関連付けの削除に失敗しました: ${deleteRelationsError.message}`,
      );
    }

    // ページ本体の削除
    const { error: deletePageError } = await supabase
      .from("TrainingPage")
      .delete()
      .eq("id", pageId)
      .eq("user_id", userId);

    if (deletePageError) {
      throw new Error(`ページの削除に失敗しました: ${deletePageError.message}`);
    }
  } catch (error) {
    console.error("TrainingPage削除エラー:", error);
    throw error;
  }
};

// ページ添付ファイル型定義
export interface PageAttachmentRow {
  id: string; // uuid PK
  page_id: string; // uuid FK → TrainingPage
  user_id: string; // uuid FK → User
  type: "image" | "video" | "youtube"; // 添付タイプ
  url: string; // CloudFront URL or YouTube URL
  thumbnail_url: string | null; // YouTube サムネイル等
  original_filename: string | null; // 元ファイル名
  file_size_bytes: number | null; // ファイルサイズ（バイト）
  sort_order: number; // 表示順
  created_at: string; // timestamp
}

// ページ添付一覧取得関数
export const getPageAttachments = async (
  pageId: string,
  userId: string,
): Promise<PageAttachmentRow[]> => {
  try {
    // ページの所有者チェック
    const { data: page, error: pageError } = await supabase
      .from("TrainingPage")
      .select("id")
      .eq("id", pageId)
      .eq("user_id", userId)
      .single();

    if (pageError || !page) {
      throw new Error("ページが見つからないか、アクセス権限がありません");
    }

    const { data: attachments, error } = await supabase
      .from("PageAttachment")
      .select("*")
      .eq("page_id", pageId)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`添付ファイルの取得に失敗しました: ${error.message}`);
    }

    return attachments || [];
  } catch (error) {
    console.error("ページ添付取得エラー:", error);
    throw error;
  }
};

// ページ添付作成関数
export const createPageAttachment = async (
  attachmentData: Omit<PageAttachmentRow, "id" | "created_at" | "sort_order">,
): Promise<PageAttachmentRow> => {
  try {
    // ページの所有者チェック
    const { data: page, error: pageError } = await supabase
      .from("TrainingPage")
      .select("id")
      .eq("id", attachmentData.page_id)
      .eq("user_id", attachmentData.user_id)
      .single();

    if (pageError || !page) {
      throw new Error("ページが見つからないか、添付の追加権限がありません");
    }

    // 現在の最大sort_orderを取得
    const { data: existingAttachments } = await supabase
      .from("PageAttachment")
      .select("sort_order")
      .eq("page_id", attachmentData.page_id)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSortOrder =
      existingAttachments && existingAttachments.length > 0
        ? (existingAttachments[0].sort_order ?? 0) + 1
        : 0;

    const { data: newAttachment, error } = await supabase
      .from("PageAttachment")
      .insert([
        {
          page_id: attachmentData.page_id,
          user_id: attachmentData.user_id,
          type: attachmentData.type,
          url: attachmentData.url,
          thumbnail_url: attachmentData.thumbnail_url,
          original_filename: attachmentData.original_filename,
          file_size_bytes: attachmentData.file_size_bytes,
          sort_order: nextSortOrder,
        },
      ])
      .select("*")
      .single();

    if (error) {
      throw new Error(`添付ファイルの作成に失敗しました: ${error.message}`);
    }

    return newAttachment;
  } catch (error) {
    console.error("ページ添付作成エラー:", error);
    throw error;
  }
};

// ページ添付削除関数
export const deletePageAttachment = async (
  attachmentId: string,
  userId: string,
): Promise<PageAttachmentRow | null> => {
  try {
    // 添付の所有者チェック
    const { data: attachment, error: fetchError } = await supabase
      .from("PageAttachment")
      .select("*")
      .eq("id", attachmentId)
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return null; // 見つからない場合
      }
      throw new Error(`添付ファイル取得に失敗しました: ${fetchError.message}`);
    }

    const { error: deleteError } = await supabase
      .from("PageAttachment")
      .delete()
      .eq("id", attachmentId)
      .eq("user_id", userId);

    if (deleteError) {
      throw new Error(
        `添付ファイルの削除に失敗しました: ${deleteError.message}`,
      );
    }

    return attachment ?? null;
  } catch (error) {
    console.error("ページ添付削除エラー:", error);
    throw error;
  }
};
