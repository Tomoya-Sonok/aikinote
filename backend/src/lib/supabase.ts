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

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const buildJstUtcIso = (
  dateString: string,
  hour: number,
  minute = 0,
  second = 0,
): string | null => {
  const parts = dateString.split("-");
  if (parts.length !== 3) return null;
  const [yearStr, monthStr, dayStr] = parts;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const timestamp =
    Date.UTC(year, month - 1, day, hour, minute, second) - JST_OFFSET_MS;
  return new Date(timestamp).toISOString();
};

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
      const iso = buildJstUtcIso(startDate, 0, 0, 0);
      if (iso) {
        filters.gte = iso;
      }
    }
    if (endDate) {
      const iso = buildJstUtcIso(endDate, 23, 59, 59);
      if (iso) {
        filters.lte = iso;
      }
    }
    if (!startDate && !endDate && date) {
      const startIso = buildJstUtcIso(date, 0, 0, 0);
      const endIso = buildJstUtcIso(date, 23, 59, 59);
      if (startIso) {
        filters.gte = startIso;
      }
      if (endIso) {
        filters.lte = endIso;
      }
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

// 統計データ型定義
export interface TagStatItem {
  tag_id: string;
  tag_name: string;
  category: string;
  page_count: number;
}

export interface MonthlyStatItem {
  month: string; // "YYYY-MM"
  attended_days: number;
  page_count: number;
}

export interface TrainingStatsData {
  training_start_date: string | null;
  first_training_date: string | null;
  total_attended_days: number;
  total_pages: number;
  attended_days_in_period: number;
  pages_in_period: number;
  tag_stats: TagStatItem[];
  monthly_stats: MonthlyStatItem[];
}

// 統計データ取得関数
export const getTrainingStats = async (
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<TrainingStatsData> => {
  // 1. User の training_start_date を取得
  const userPromise = supabase
    .from("User")
    .select("training_start_date")
    .eq("id", userId)
    .single();

  // 2. TrainingDate: 全件取得（is_attended=true）
  const allAttendedPromise = supabase
    .from("TrainingDate")
    .select("training_date")
    .eq("user_id", userId)
    .eq("is_attended", true)
    .order("training_date", { ascending: true });

  // 3. TrainingPage: 全件の created_at を取得
  const allPagesPromise = supabase
    .from("TrainingPage")
    .select("id, created_at")
    .eq("user_id", userId);

  // 4. タグ統計: TrainingPageTag + UserTag
  const allTagsPromise = supabase
    .from("TrainingPageTag")
    .select("training_page_id, user_tag_id, UserTag!inner(id, name, category)")
    .eq("UserTag.user_id", userId);

  const [userResult, attendedResult, pagesResult, tagsResult] =
    await Promise.all([
      userPromise,
      allAttendedPromise,
      allPagesPromise,
      allTagsPromise,
    ]);

  if (userResult.error) {
    throw new Error(
      `ユーザー情報の取得に失敗しました: ${userResult.error.message}`,
    );
  }
  if (attendedResult.error) {
    throw new Error(
      `稽古参加日の取得に失敗しました: ${attendedResult.error.message}`,
    );
  }
  if (pagesResult.error) {
    throw new Error(`ページの取得に失敗しました: ${pagesResult.error.message}`);
  }
  if (tagsResult.error) {
    throw new Error(
      `タグ統計の取得に失敗しました: ${tagsResult.error.message}`,
    );
  }

  const trainingStartDate =
    (userResult.data?.training_start_date as string | null) ?? null;
  const allAttendedDates = (attendedResult.data ?? []).map(
    (d) => d.training_date as string,
  );
  const firstTrainingDate =
    allAttendedDates.length > 0 ? allAttendedDates[0] : null;
  const allPages = pagesResult.data ?? [];
  const allTagRelations = tagsResult.data ?? [];

  // 期間フィルタリング
  const inPeriod = (dateStr: string): boolean => {
    if (!startDate && !endDate) return true;
    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  };

  const inPeriodTimestamp = (isoStr: string): boolean => {
    const dateStr = isoStr.slice(0, 10);
    return inPeriod(dateStr);
  };

  // 全期間の参加日数
  const totalAttendedDays = allAttendedDates.length;

  // 全期間のページ数
  const totalPages = allPages.length;

  // 期間内の参加日数
  const attendedInPeriod = allAttendedDates.filter(inPeriod);
  const attendedDaysInPeriod = attendedInPeriod.length;

  // 期間内のページ数
  const pagesInPeriod = allPages.filter((p) => inPeriodTimestamp(p.created_at));
  const pagesInPeriodCount = pagesInPeriod.length;

  // 期間内のページIDセット（タグフィルタ用）
  const periodPageIds = new Set(pagesInPeriod.map((p) => p.id));

  // タグ統計（期間内のページに限定）
  const tagCountMap = new Map<
    string,
    { tag_id: string; tag_name: string; category: string; count: number }
  >();

  for (const rel of allTagRelations) {
    if (!periodPageIds.has(rel.training_page_id)) continue;

    const tag = rel.UserTag as unknown as {
      id: string;
      name: string;
      category: string;
    };
    if (!tag) continue;

    const existing = tagCountMap.get(tag.id);
    if (existing) {
      existing.count += 1;
    } else {
      tagCountMap.set(tag.id, {
        tag_id: tag.id,
        tag_name: tag.name,
        category: tag.category,
        count: 1,
      });
    }
  }

  const tagStats: TagStatItem[] = Array.from(tagCountMap.values())
    .map((t) => ({
      tag_id: t.tag_id,
      tag_name: t.tag_name,
      category: t.category,
      page_count: t.count,
    }))
    .sort((a, b) => b.page_count - a.page_count);

  // 月別統計
  const monthlyMap = new Map<
    string,
    { attended_days: number; page_count: number }
  >();

  for (const date of attendedInPeriod) {
    const month = date.slice(0, 7); // "YYYY-MM"
    const entry = monthlyMap.get(month) ?? { attended_days: 0, page_count: 0 };
    entry.attended_days += 1;
    monthlyMap.set(month, entry);
  }

  for (const page of pagesInPeriod) {
    const month = page.created_at.slice(0, 7);
    const entry = monthlyMap.get(month) ?? { attended_days: 0, page_count: 0 };
    entry.page_count += 1;
    monthlyMap.set(month, entry);
  }

  const monthlyStats: MonthlyStatItem[] = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      attended_days: data.attended_days,
      page_count: data.page_count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    training_start_date: trainingStartDate,
    first_training_date: firstTrainingDate,
    total_attended_days: totalAttendedDays,
    total_pages: totalPages,
    attended_days_in_period: attendedDaysInPeriod,
    pages_in_period: pagesInPeriodCount,
    tag_stats: tagStats,
    monthly_stats: monthlyStats,
  };
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

// ============================================
// ソーシャル機能 型定義
// ============================================

export interface SocialPostRow {
  id: string;
  user_id: string;
  content: string;
  post_type: string;
  visibility: string;
  author_dojo_style_id: string | null;
  author_dojo_name: string | null;
  favorite_count: number;
  reply_count: number;
  is_deleted: boolean;
  source_page_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialPostAttachmentRow {
  id: string;
  post_id: string;
  user_id: string;
  type: string;
  url: string;
  thumbnail_url: string | null;
  original_filename: string | null;
  file_size_bytes: number | null;
  sort_order: number;
  created_at: string;
}

export interface SocialReplyRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface SocialFavoriteRow {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  type: string;
  recipient_user_id: string;
  actor_user_id: string;
  post_id: string | null;
  reply_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PostReportRow {
  id: string;
  reporter_user_id: string;
  post_id: string | null;
  reply_id: string | null;
  reason: string;
  detail: string | null;
  status: string;
  created_at: string;
}

// ============================================
// ソーシャル機能 ヘルパー関数
// ============================================

export const createSocialPost = async (
  supabaseClient: SupabaseClient,
  data: {
    user_id: string;
    content: string;
    post_type: string;
    visibility: string;
    author_dojo_style_id: string | null;
    author_dojo_name: string | null;
    source_page_id?: string;
  },
): Promise<SocialPostRow> => {
  const { data: post, error } = await supabaseClient
    .from("SocialPost")
    .insert({
      user_id: data.user_id,
      content: data.content,
      post_type: data.post_type,
      visibility: data.visibility,
      author_dojo_style_id: data.author_dojo_style_id,
      author_dojo_name: data.author_dojo_name,
      source_page_id: data.source_page_id ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`投稿の作成に失敗しました: ${error.message}`);
  }

  return post;
};

export const getSocialFeed = async (
  supabaseClient: SupabaseClient,
  viewerUserId: string,
  viewerDojoStyleId: string | null,
  tab: string,
  limit: number,
  offset: number,
): Promise<SocialPostRow[]> => {
  const { data, error } = await supabaseClient.rpc("get_social_feed", {
    viewer_user_id: viewerUserId,
    viewer_dojo_style_id: viewerDojoStyleId,
    tab_filter: tab,
    feed_limit: limit,
    feed_offset: offset,
  });

  if (error) {
    throw new Error(`フィード取得に失敗しました: ${error.message}`);
  }

  return data ?? [];
};

export const getSocialPostById = async (
  supabaseClient: SupabaseClient,
  postId: string,
): Promise<SocialPostRow | null> => {
  const { data, error } = await supabaseClient
    .from("SocialPost")
    .select("*")
    .eq("id", postId)
    .eq("is_deleted", false)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`投稿の取得に失敗しました: ${error.message}`);
  }

  return data;
};

export const updateSocialPost = async (
  supabaseClient: SupabaseClient,
  postId: string,
  userId: string,
  data: { content?: string },
): Promise<SocialPostRow> => {
  const { data: post, error } = await supabaseClient
    .from("SocialPost")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .select("*")
    .single();

  if (error) {
    throw new Error(`投稿の更新に失敗しました: ${error.message}`);
  }

  return post;
};

export const softDeleteSocialPost = async (
  supabaseClient: SupabaseClient,
  postId: string,
  userId: string,
): Promise<void> => {
  const { error } = await supabaseClient
    .from("SocialPost")
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`投稿の削除に失敗しました: ${error.message}`);
  }
};

export const createSocialPostTags = async (
  supabaseClient: SupabaseClient,
  postId: string,
  tagIds: string[],
): Promise<void> => {
  if (tagIds.length === 0) return;

  const rows = tagIds.map((tagId) => ({
    post_id: postId,
    user_tag_id: tagId,
  }));

  const { error } = await supabaseClient.from("SocialPostTag").insert(rows);

  if (error) {
    throw new Error(`投稿タグの作成に失敗しました: ${error.message}`);
  }
};

export const updateSocialPostTags = async (
  supabaseClient: SupabaseClient,
  postId: string,
  tagIds: string[],
): Promise<void> => {
  const { error: deleteError } = await supabaseClient
    .from("SocialPostTag")
    .delete()
    .eq("post_id", postId);

  if (deleteError) {
    throw new Error(`投稿タグの削除に失敗しました: ${deleteError.message}`);
  }

  if (tagIds.length > 0) {
    await createSocialPostTags(supabaseClient, postId, tagIds);
  }
};

export const getSocialPostWithDetails = async (
  supabaseClient: SupabaseClient,
  postId: string,
  viewerId: string,
): Promise<{
  post: SocialPostRow;
  attachments: SocialPostAttachmentRow[];
  tags: { id: string; name: string; category: string }[];
  author: {
    id: string;
    username: string;
    profile_image_url: string | null;
    aikido_rank: string | null;
  };
  replies: (SocialReplyRow & {
    user: { id: string; username: string; profile_image_url: string | null };
  })[];
  is_favorited: boolean;
} | null> => {
  const post = await getSocialPostById(supabaseClient, postId);
  if (!post) return null;

  const [
    attachmentsResult,
    tagsResult,
    authorResult,
    repliesResult,
    favoriteResult,
  ] = await Promise.all([
    supabaseClient
      .from("SocialPostAttachment")
      .select("*")
      .eq("post_id", postId)
      .order("sort_order", { ascending: true }),
    supabaseClient
      .from("SocialPostTag")
      .select("user_tag_id, UserTag(id, name, category)")
      .eq("post_id", postId),
    supabaseClient
      .from("User")
      .select("id, username, profile_image_url, aikido_rank")
      .eq("id", post.user_id)
      .single(),
    supabaseClient
      .from("SocialReply")
      .select("*, User(id, username, profile_image_url)")
      .eq("post_id", postId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true }),
    supabaseClient
      .from("SocialFavorite")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", viewerId)
      .maybeSingle(),
  ]);

  // biome-ignore lint/suspicious/noExplicitAny: Supabase join result
  const tags = (tagsResult.data ?? []).map((row: any) => ({
    id: row.UserTag?.id ?? row.user_tag_id,
    name: row.UserTag?.name ?? "",
    category: row.UserTag?.category ?? "",
  }));

  // biome-ignore lint/suspicious/noExplicitAny: Supabase join result
  const replies = (repliesResult.data ?? []).map((row: any) => ({
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    content: row.content,
    is_deleted: row.is_deleted,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: {
      id: row.User?.id ?? row.user_id,
      username: row.User?.username ?? "",
      profile_image_url: row.User?.profile_image_url ?? null,
    },
  }));

  return {
    post,
    attachments: attachmentsResult.data ?? [],
    tags,
    author: authorResult.data ?? {
      id: post.user_id,
      username: "",
      profile_image_url: null,
      aikido_rank: null,
    },
    replies,
    is_favorited: !!favoriteResult.data,
  };
};

export const createSocialReply = async (
  supabaseClient: SupabaseClient,
  postId: string,
  userId: string,
  content: string,
): Promise<SocialReplyRow> => {
  const { data, error } = await supabaseClient
    .from("SocialReply")
    .insert({
      post_id: postId,
      user_id: userId,
      content,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`返信の作成に失敗しました: ${error.message}`);
  }

  return data;
};

export const toggleSocialFavorite = async (
  supabaseClient: SupabaseClient,
  postId: string,
  userId: string,
): Promise<{ is_favorited: boolean }> => {
  const { data: existing } = await supabaseClient
    .from("SocialFavorite")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseClient
      .from("SocialFavorite")
      .delete()
      .eq("id", existing.id);

    if (error) {
      throw new Error(`お気に入り解除に失敗しました: ${error.message}`);
    }

    return { is_favorited: false };
  }

  const { error } = await supabaseClient
    .from("SocialFavorite")
    .insert({ post_id: postId, user_id: userId });

  if (error) {
    throw new Error(`お気に入り登録に失敗しました: ${error.message}`);
  }

  return { is_favorited: true };
};

export const createNotification = async (
  supabaseClient: SupabaseClient,
  params: {
    type: string;
    recipient_user_id: string;
    actor_user_id: string;
    post_id?: string;
    reply_id?: string;
  },
): Promise<void> => {
  // 自分自身への通知はスキップ
  if (params.recipient_user_id === params.actor_user_id) return;

  const { error } = await supabaseClient.from("Notification").insert({
    type: params.type,
    recipient_user_id: params.recipient_user_id,
    actor_user_id: params.actor_user_id,
    post_id: params.post_id ?? null,
    reply_id: params.reply_id ?? null,
  });

  if (error) {
    console.error("通知の作成に失敗しました:", error);
  }
};

export const deleteNotificationByFavorite = async (
  supabaseClient: SupabaseClient,
  postId: string,
  userId: string,
): Promise<void> => {
  const { error } = await supabaseClient
    .from("Notification")
    .delete()
    .eq("type", "favorite")
    .eq("actor_user_id", userId)
    .eq("post_id", postId);

  if (error) {
    console.error("通知の削除に失敗しました:", error);
  }
};

export const getNotifications = async (
  supabaseClient: SupabaseClient,
  userId: string,
  limit: number,
  offset: number,
): Promise<NotificationRow[]> => {
  const { data, error } = await supabaseClient
    .from("Notification")
    .select(
      "*, User!Notification_actor_user_id_fkey(id, username, profile_image_url)",
    )
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`通知の取得に失敗しました: ${error.message}`);
  }

  return data ?? [];
};

export const markNotificationsRead = async (
  supabaseClient: SupabaseClient,
  userId: string,
  ids?: string[],
  markAll?: boolean,
): Promise<void> => {
  let query = supabaseClient
    .from("Notification")
    .update({ is_read: true })
    .eq("recipient_user_id", userId)
    .eq("is_read", false);

  if (!markAll && ids && ids.length > 0) {
    query = query.in("id", ids);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`通知の既読化に失敗しました: ${error.message}`);
  }
};

export const createPostReport = async (
  supabaseClient: SupabaseClient,
  data: {
    reporter_user_id: string;
    post_id?: string;
    reply_id?: string;
    reason: string;
    detail?: string;
  },
): Promise<PostReportRow> => {
  // 重複チェック
  let duplicateQuery = supabaseClient
    .from("PostReport")
    .select("id")
    .eq("reporter_user_id", data.reporter_user_id);

  if (data.post_id) {
    duplicateQuery = duplicateQuery.eq("post_id", data.post_id);
  }
  if (data.reply_id) {
    duplicateQuery = duplicateQuery.eq("reply_id", data.reply_id);
  }

  const { data: existing } = await duplicateQuery.maybeSingle();

  if (existing) {
    throw new Error("DUPLICATE_REPORT");
  }

  const { data: report, error } = await supabaseClient
    .from("PostReport")
    .insert({
      reporter_user_id: data.reporter_user_id,
      post_id: data.post_id ?? null,
      reply_id: data.reply_id ?? null,
      reason: data.reason,
      detail: data.detail ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`通報の作成に失敗しました: ${error.message}`);
  }

  return report;
};

export const searchSocialPosts = async (
  supabaseClient: SupabaseClient,
  viewerId: string,
  viewerDojoStyleId: string | null,
  params: {
    query?: string;
    dojo_name?: string;
    rank?: string;
    limit: number;
    offset: number;
  },
): Promise<SocialPostRow[]> => {
  let dbQuery = supabaseClient
    .from("SocialPost")
    .select("*, User!inner(id, aikido_rank, dojo_style_id)")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.query) {
    dbQuery = dbQuery.ilike("content", `%${params.query}%`);
  }

  if (params.dojo_name) {
    dbQuery = dbQuery.ilike("author_dojo_name", `%${params.dojo_name}%`);
  }

  if (params.rank) {
    dbQuery = dbQuery.eq("User.aikido_rank", params.rank);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`投稿検索に失敗しました: ${error.message}`);
  }

  // 公開範囲フィルタ（アプリケーション層）
  const filtered = (data ?? []).filter((post) => {
    if (post.visibility === "public") return true;
    if (
      post.visibility === "closed" &&
      post.author_dojo_style_id === viewerDojoStyleId
    )
      return true;
    if (post.user_id === viewerId) return true;
    return false;
  });

  return filtered;
};

export const getSocialProfile = async (
  supabaseClient: SupabaseClient,
  targetUserId: string,
  viewerId: string,
  viewerDojoStyleId: string | null,
): Promise<{
  user: {
    id: string;
    username: string;
    profile_image_url: string | null;
    bio: string | null;
    aikido_rank: string | null;
    dojo_style_name: string | null;
  };
  posts: SocialPostRow[];
  total_favorites?: number;
} | null> => {
  const { data: user, error: userError } = await supabaseClient
    .from("User")
    .select(
      "id, username, profile_image_url, bio, aikido_rank, dojo_style_name",
    )
    .eq("id", targetUserId)
    .single();

  if (userError || !user) {
    return null;
  }

  // 公開投稿を取得（公開範囲チェック適用）
  const postsQuery = supabaseClient
    .from("SocialPost")
    .select("*")
    .eq("user_id", targetUserId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: posts } = await postsQuery;

  const visiblePosts = (posts ?? []).filter((post) => {
    if (post.visibility === "public") return true;
    if (
      post.visibility === "closed" &&
      post.author_dojo_style_id === viewerDojoStyleId
    )
      return true;
    if (post.user_id === viewerId) return true;
    return false;
  });

  const result: {
    user: typeof user;
    posts: SocialPostRow[];
    total_favorites?: number;
  } = { user, posts: visiblePosts };

  // 本人のみ累計お気に入り数を返却
  if (targetUserId === viewerId) {
    const { data: favData } = await supabaseClient
      .from("SocialPost")
      .select("favorite_count")
      .eq("user_id", targetUserId)
      .eq("is_deleted", false);

    result.total_favorites = (favData ?? []).reduce(
      (sum, p) => sum + (p.favorite_count ?? 0),
      0,
    );
  }

  return result;
};
