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
  content_mode?: "free" | "tag_based"; // #280 入力モード（migration 027、DEFAULT 'free'。既存コード互換のため optional）
  is_public: boolean; // boolean (デフォルト: false)
  created_at: string; // timestamp
  updated_at: string; // timestamp
}

export interface UserTagRow {
  id: string; // uuid PK
  user_id: string; // uuid FK
  name: string; // text
  category: string; // text (取り、受け、技、カスタムカテゴリ)
  created_at: string; // timestamp
  updated_at?: string; // timestamptz (migration 025 — DB 上は必須だが既存コード互換のため optional)
  sort_order: number | null; // 並び順（カテゴリ内）
}

export interface UserCategoryRow {
  id: string; // uuid PK
  user_id: string; // uuid FK
  name: string; // text (カテゴリ表示名)
  slug: string; // text (内部キー)
  sort_order: number; // 並び順
  is_default: boolean; // デフォルト3カテゴリかどうか
  created_at: string; // timestamptz
  updated_at?: string; // timestamptz (migration 025 — DB 上は必須だが既存コード互換のため optional)
}

export interface TitleTemplateRow {
  id: string;
  user_id: string;
  template_text: string;
  date_format: string | null;
  sort_order: number;
  created_at: string;
}

export interface TrainingPageTagRow {
  id: string; // uuid PK
  training_page_id: string; // uuid FK
  user_tag_id: string; // uuid FK
  created_at?: string; // timestamptz (migration 025 — DB DEFAULT で埋まるので insert 時は省略可)
  updated_at?: string; // timestamptz (migration 025 — DB DEFAULT で埋まるので insert 時は省略可)
}

// #280 タグごとのメモ
export interface TrainingPageMemoRow {
  id: string; // uuid PK
  training_page_id: string; // uuid FK → TrainingPage
  content: string; // text（1〜500文字）
  sort_order: number; // 表示順
  created_at: string; // timestamptz
  updated_at?: string; // timestamptz
}

// 取得時に使う「メモ + 紐づくタグ」の形
export interface TrainingPageMemoWithTags {
  id: string;
  content: string;
  sort_order: number;
  tags: UserTagRow[];
}

// 作成/更新時に受け取るメモ入力（タグは name + category で指定）
export type TrainingPageMemoInput = {
  tags: { name: string; category: string }[];
  content: string;
};

// (category, name) を一意キーにするためのヘルパー
const tagMapKey = (category: string, name: string): string =>
  `${category}\u001f${name}`;

// 指定された (name, category) のタグが無ければ作成し、キー→UserTag の Map を返す
const ensureUserTags = async (
  userId: string,
  tagRefs: { name: string; category: string }[],
): Promise<Map<string, UserTagRow>> => {
  const map = new Map<string, UserTagRow>();
  for (const { name, category } of tagRefs) {
    const key = tagMapKey(category, name);
    if (map.has(key)) continue;

    const { data: existingTag } = await supabase
      .from("UserTag")
      .select("*")
      .eq("user_id", userId)
      .eq("name", name)
      .eq("category", category)
      .single();

    if (existingTag) {
      map.set(key, existingTag);
      continue;
    }

    const { data: newTag, error } = await supabase
      .from("UserTag")
      .insert([
        {
          user_id: userId,
          name,
          category,
          created_at: new Date().toISOString(),
        },
      ])
      .select("*")
      .single();

    if (error) {
      throw new Error(`タグの作成に失敗しました: ${error.message}`);
    }
    map.set(key, newTag);
  }
  return map;
};

// tag_based モードのメモ群を保存する。
// - TrainingPageMemo / TrainingPageMemoTag を作成
// - 全メモのタグ和集合を TrainingPageTag に保存（一覧のタグ絞り込み互換のため）
const persistPageMemos = async (
  pageId: string,
  userId: string,
  memos: TrainingPageMemoInput[],
): Promise<{ tags: UserTagRow[]; memos: TrainingPageMemoWithTags[] }> => {
  const tagMap = await ensureUserTags(
    userId,
    memos.flatMap((m) => m.tags),
  );

  const memosWithTags: TrainingPageMemoWithTags[] = [];
  const unionTagIds = new Set<string>();

  for (let i = 0; i < memos.length; i++) {
    const memoInput = memos[i];

    const { data: memo, error: memoError } = await supabase
      .from("TrainingPageMemo")
      .insert([
        {
          training_page_id: pageId,
          content: memoInput.content,
          sort_order: i,
        },
      ])
      .select("*")
      .single();

    if (memoError) {
      throw new Error(`メモの作成に失敗しました: ${memoError.message}`);
    }

    const memoTags: UserTagRow[] = [];
    const seenTagIds = new Set<string>();
    const memoTagRows: {
      training_page_memo_id: string;
      user_tag_id: string;
    }[] = [];

    for (const t of memoInput.tags) {
      const tag = tagMap.get(tagMapKey(t.category, t.name));
      if (!tag || seenTagIds.has(tag.id)) continue;
      seenTagIds.add(tag.id);
      memoTags.push(tag);
      memoTagRows.push({
        training_page_memo_id: memo.id,
        user_tag_id: tag.id,
      });
      unionTagIds.add(tag.id);
    }

    if (memoTagRows.length > 0) {
      const { error: memoTagError } = await supabase
        .from("TrainingPageMemoTag")
        .insert(memoTagRows);
      if (memoTagError) {
        throw new Error(
          `メモタグの作成に失敗しました: ${memoTagError.message}`,
        );
      }
    }

    memosWithTags.push({
      id: memo.id,
      content: memo.content,
      sort_order: memo.sort_order,
      tags: memoTags,
    });
  }

  // タグの和集合を TrainingPageTag に保存
  const unionTags: UserTagRow[] = [];
  if (unionTagIds.size > 0) {
    const trainingPageTags = [...unionTagIds].map((id) => ({
      training_page_id: pageId,
      user_tag_id: id,
    }));
    const { error: relationError } = await supabase
      .from("TrainingPageTag")
      .insert(trainingPageTags);
    if (relationError) {
      throw new Error(`タグ関連付けに失敗しました: ${relationError.message}`);
    }
    for (const tag of tagMap.values()) {
      if (unionTagIds.has(tag.id)) unionTags.push(tag);
    }
  }

  return { tags: unionTags, memos: memosWithTags };
};

// ページに紐づく既存メモを全削除（TrainingPageMemoTag は CASCADE で消える）
const deletePageMemos = async (pageId: string): Promise<void> => {
  const { error } = await supabase
    .from("TrainingPageMemo")
    .delete()
    .eq("training_page_id", pageId);
  if (error) {
    throw new Error(`既存メモの削除に失敗しました: ${error.message}`);
  }
};

// 複数ページのメモ + タグをまとめて取得（N+1回避）
const fetchMemosForPages = async (
  pageIds: string[],
): Promise<Map<string, TrainingPageMemoWithTags[]>> => {
  const result = new Map<string, TrainingPageMemoWithTags[]>();
  if (pageIds.length === 0) return result;

  const { data: memoRows, error } = await supabase
    .from("TrainingPageMemo")
    .select("*")
    .in("training_page_id", pageIds)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("メモ取得エラー:", error);
    return result;
  }
  if (!memoRows || memoRows.length === 0) return result;

  const memoIds = memoRows.map((m) => m.id);
  const tagsByMemo = new Map<string, UserTagRow[]>();

  const { data: memoTagRows } = await supabase
    .from("TrainingPageMemoTag")
    .select("training_page_memo_id, UserTag(*)")
    .in("training_page_memo_id", memoIds);

  for (const mt of (memoTagRows ?? []) as {
    training_page_memo_id: string;
    UserTag: UserTagRow | UserTagRow[];
  }[]) {
    const tag = Array.isArray(mt.UserTag) ? mt.UserTag[0] : mt.UserTag;
    if (!tag) continue;
    const list = tagsByMemo.get(mt.training_page_memo_id) ?? [];
    list.push(tag);
    tagsByMemo.set(mt.training_page_memo_id, list);
  }

  for (const m of memoRows) {
    const list = result.get(m.training_page_id) ?? [];
    list.push({
      id: m.id,
      content: m.content,
      sort_order: m.sort_order,
      tags: tagsByMemo.get(m.id) ?? [],
    });
    result.set(m.training_page_id, list);
  }
  return result;
};

export interface TrainingDateRow {
  id: string; // uuid PK
  user_id: string; // uuid FK
  training_date: string; // date
  is_attended: boolean; // 参加有無
  created_at: string; // timestamp
  updated_at?: string; // timestamptz (migration 025 — DB 上は必須だが既存コード互換のため optional)
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

// タグ名の新旧形式を統合するヘルパー
const resolveTagNamesForPage = (
  tagNames:
    | { tori: string[]; uke: string[]; waza: string[] }
    | Record<string, string[]>,
): Record<string, string[]> => {
  if ("tori" in tagNames && "uke" in tagNames && "waza" in tagNames) {
    const result: Record<string, string[]> = {};
    if (tagNames.tori.length > 0) result.取り = tagNames.tori;
    if (tagNames.uke.length > 0) result.受け = tagNames.uke;
    if (tagNames.waza.length > 0) result.技 = tagNames.waza;
    return result;
  }
  return tagNames as Record<string, string[]>;
};

// データベース操作関数
export const createTrainingPage = async (
  pageData: Omit<TrainingPageRow, "id" | "created_at" | "updated_at"> & {
    created_at?: string;
    content_mode?: string;
  },
  tagNames:
    | { tori: string[]; uke: string[]; waza: string[] }
    | Record<string, string[]>,
  memos?: TrainingPageMemoInput[],
): Promise<{
  page: TrainingPageRow;
  tags: UserTagRow[];
  memos?: TrainingPageMemoWithTags[];
}> => {
  // トランザクションを使用してページと関連タグを作成
  try {
    const contentMode = pageData.content_mode ?? "free";

    // 1. TrainingPageを作成
    const baseInsert = {
      title: pageData.title,
      content: pageData.content,
      user_id: pageData.user_id,
      is_public: pageData.is_public ?? false,
      content_mode: contentMode,
    };
    const insertPageData = pageData.created_at
      ? { ...baseInsert, created_at: pageData.created_at }
      : baseInsert;

    const { data: newPage, error: pageError } = await supabase
      .from("TrainingPage")
      .insert([insertPageData])
      .select("*")
      .single();

    if (pageError) {
      throw new Error(`ページの作成に失敗しました: ${pageError.message}`);
    }

    // タグごとのメモモード: メモ・メモタグ・タグ和集合を保存して早期 return
    if (contentMode === "tag_based" && memos && memos.length > 0) {
      const { tags, memos: memosWithTags } = await persistPageMemos(
        newPage.id,
        pageData.user_id,
        memos,
      );
      return { page: newPage, tags, memos: memosWithTags };
    }

    // 2. すべてのタグ名を統合してカテゴリ付きで配列化
    // 新旧両形式に対応
    const resolvedTagNames = resolveTagNamesForPage(tagNames);
    const categories = Object.entries(resolvedTagNames).flatMap(
      ([category, names]) => names.map((name) => ({ name, category })),
    );

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
  pages: {
    page: TrainingPageRow;
    tags: UserTagRow[];
    memos?: TrainingPageMemoWithTags[];
  }[];
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

    // フリーワード検索: タイトル・自由入力本文・タグごとのメモ本文を対象にする
    if (query) {
      const orConditions = [
        `title.ilike.%${query}%`,
        `content.ilike.%${query}%`,
      ];
      // tag_based ページは本文が空でメモ側に内容を持つため、
      // メモ本文にマッチするページIDも検索対象に含める
      const { data: memoMatches } = await supabase
        .from("TrainingPageMemo")
        .select("training_page_id")
        .ilike("content", `%${query}%`);
      const memoPageIds = [
        ...new Set(
          (memoMatches ?? []).map(
            (m: { training_page_id: string }) => m.training_page_id,
          ),
        ),
      ];
      if (memoPageIds.length > 0) {
        orConditions.push(`id.in.(${memoPageIds.join(",")})`);
      }
      queryBuilder = queryBuilder.or(orConditions.join(","));
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

    // 全ページのタグを一括取得（N+1解消）
    const fetchedPageIds = pages.map((p) => p.id);
    const tagMap = new Map<string, UserTagRow[]>();

    const { data: allPageTags, error: tagsError } = await supabase
      .from("TrainingPageTag")
      .select("training_page_id, UserTag(*)")
      .in("training_page_id", fetchedPageIds);

    if (tagsError) {
      console.error("ページタグの一括取得エラー:", tagsError);
    } else if (allPageTags) {
      for (const pt of allPageTags as {
        training_page_id: string;
        UserTag: UserTagRow | UserTagRow[];
      }[]) {
        const tag = Array.isArray(pt.UserTag) ? pt.UserTag[0] : pt.UserTag;
        if (!tag) continue;
        const existing = tagMap.get(pt.training_page_id);
        if (existing) {
          existing.push(tag);
        } else {
          tagMap.set(pt.training_page_id, [tag]);
        }
      }
    }

    // tag_based ページのメモを一括取得（一覧カードの本文抜粋表示用）
    const memosByPage = await fetchMemosForPages(
      pages.filter((p) => p.content_mode === "tag_based").map((p) => p.id),
    );

    const pagesWithTags = pages.map((page) => ({
      page,
      tags: tagMap.get(page.id) ?? [],
      memos: memosByPage.get(page.id),
    }));

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
): Promise<{
  page: TrainingPageRow;
  tags: UserTagRow[];
  memos?: TrainingPageMemoWithTags[];
}> => {
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

    // tag_based ページはメモ + メモタグも取得する
    const memos =
      page.content_mode === "tag_based"
        ? ((await fetchMemosForPages([pageId])).get(pageId) ?? [])
        : undefined;

    return { page, tags, memos };
  } catch (error) {
    console.error("TrainingPage詳細取得エラー:", error);
    throw error;
  }
};

// ページ更新関数
export const updateTrainingPage = async (
  pageData: Omit<TrainingPageRow, "created_at" | "updated_at"> & {
    id: string;
    content_mode?: string;
  },
  tagNames:
    | { tori: string[]; uke: string[]; waza: string[] }
    | Record<string, string[]>,
  memos?: TrainingPageMemoInput[],
): Promise<{
  page: TrainingPageRow;
  tags: UserTagRow[];
  memos?: TrainingPageMemoWithTags[];
}> => {
  try {
    const contentMode = pageData.content_mode ?? "free";

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
    const updateFields: Record<string, unknown> = {
      title: pageData.title,
      content: pageData.content,
      content_mode: contentMode,
      updated_at: new Date().toISOString(),
    };
    if (pageData.is_public !== undefined) {
      updateFields.is_public = pageData.is_public;
    }
    const { data: updatedPage, error: pageError } = await supabase
      .from("TrainingPage")
      .update(updateFields)
      .eq("id", pageData.id)
      .eq("user_id", pageData.user_id)
      .select("*")
      .single();

    if (pageError) {
      throw new Error(`ページの更新に失敗しました: ${pageError.message}`);
    }

    // 3. 既存のタグ関連付けとメモを削除（モード切替時も含めて作り直す）
    const { error: deleteTagsError } = await supabase
      .from("TrainingPageTag")
      .delete()
      .eq("training_page_id", pageData.id);

    if (deleteTagsError) {
      throw new Error(
        `既存のタグ関連付け削除に失敗しました: ${deleteTagsError.message}`,
      );
    }

    await deletePageMemos(pageData.id);

    // タグごとのメモモード: メモ・メモタグ・タグ和集合を保存して早期 return
    if (contentMode === "tag_based" && memos && memos.length > 0) {
      const { tags, memos: memosWithTags } = await persistPageMemos(
        updatedPage.id,
        pageData.user_id,
        memos,
      );
      return { page: updatedPage, tags, memos: memosWithTags };
    }

    // 4. 新しいタグを処理（createTrainingPageと同じロジック）
    const resolvedTagNames = resolveTagNamesForPage(tagNames);
    const categories = Object.entries(resolvedTagNames).flatMap(
      ([category, names]) => names.map((name) => ({ name, category })),
    );

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

    // 連動する公開投稿（SocialPost）を soft-delete する。
    // SocialPost.source_page_id は ON DELETE SET NULL のため、ページ削除より前に
    // 実行しないと source_page_id で当該投稿を引けなくなる（フィードに残ってしまう）。
    try {
      await syncSocialPostForTrainingPage(supabase, pageId, userId, "", false);
    } catch (socialError) {
      console.error("SocialPost 連動削除エラー:", socialError);
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
  updated_at?: string; // timestamptz (migration 026 — DB 上は必須だが既存コード互換のため optional)
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
  favorite_count: number;
  created_at: string;
  updated_at: string;
}

export interface SocialFavoriteRow {
  id: string;
  post_id: string | null;
  reply_id: string | null;
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

/**
 * TrainingPage の is_public 変更に連動して SocialPost を作成/更新/soft-delete する
 */
// tag_based ページのメモ本文を、SocialPost 表示・検索用テキストに合成する
// （各メモ本文を空行区切りで連結。タグごとの表示は詳細画面が source ページから別途行う）
const composeMemoContentForPage = async (
  supabaseClient: SupabaseClient,
  pageId: string,
): Promise<string> => {
  const { data: memoRows } = await supabaseClient
    .from("TrainingPageMemo")
    .select("content, sort_order")
    .eq("training_page_id", pageId)
    .order("sort_order", { ascending: true });

  return (memoRows ?? [])
    .map((m: { content: string }) => m.content)
    .filter((c: string) => c.trim().length > 0)
    .join("\n\n");
};

export const syncSocialPostForTrainingPage = async (
  supabaseClient: SupabaseClient,
  pageId: string,
  userId: string,
  content: string,
  isPublic: boolean,
  contentMode?: string,
): Promise<void> => {
  // 既存の SocialPost を検索
  const { data: existingPost } = await supabaseClient
    .from("SocialPost")
    .select("id, is_deleted")
    .eq("source_page_id", pageId)
    .maybeSingle();

  if (isPublic) {
    // tag_based ページは本文が空のため、メモ本文を合成して SocialPost.content に持たせる
    // （フィード表示・投稿検索が SocialPost.content を参照するため）
    const effectiveContent =
      contentMode === "tag_based"
        ? await composeMemoContentForPage(supabaseClient, pageId)
        : content;

    if (existingPost) {
      // 既存の SocialPost を更新（再公開含む）
      await supabaseClient
        .from("SocialPost")
        .update({
          content: effectiveContent,
          is_deleted: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPost.id);
    } else {
      // 新規作成: User の道場情報を取得
      const { data: userData } = await supabaseClient
        .from("User")
        .select("dojo_style_id, dojo_style_name")
        .eq("id", userId)
        .single();

      await createSocialPost(supabaseClient, {
        user_id: userId,
        content: effectiveContent,
        post_type: "training_record",
        author_dojo_style_id: userData?.dojo_style_id ?? null,
        author_dojo_name: userData?.dojo_style_name ?? null,
        source_page_id: pageId,
      });
    }
  } else if (existingPost && !existingPost.is_deleted) {
    // 非公開化: soft-delete
    await supabaseClient
      .from("SocialPost")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingPost.id);
  }
};

/**
 * source_page_id から TrainingPage の詳細データ（タイトル、タグ含む）を取得する
 */
export const getSourcePageData = async (
  supabaseClient: SupabaseClient,
  sourcePageId: string,
): Promise<{
  id: string;
  title: string;
  content: string;
  content_mode: "free" | "tag_based";
  tags: { name: string; category: string }[];
  // tag_based のときのみ要素を持つ（タグごとに入力したメモ）
  memos: {
    content: string;
    sort_order: number;
    tags: { name: string; category: string }[];
  }[];
} | null> => {
  const { data: pageData } = await supabaseClient
    .from("TrainingPage")
    .select("id, title, content, content_mode")
    .eq("id", sourcePageId)
    .single();

  if (!pageData) return null;

  const { data: pageTagsData } = await supabaseClient
    .from("TrainingPageTag")
    .select("UserTag(name, category)")
    .eq("training_page_id", sourcePageId);

  const contentMode: "free" | "tag_based" =
    pageData.content_mode === "tag_based" ? "tag_based" : "free";

  // tag_based のページはメモ（本文 + タグ）も取得する
  let memos: {
    content: string;
    sort_order: number;
    tags: { name: string; category: string }[];
  }[] = [];
  if (contentMode === "tag_based") {
    const { data: memoRows } = await supabaseClient
      .from("TrainingPageMemo")
      .select("id, content, sort_order")
      .eq("training_page_id", sourcePageId)
      .order("sort_order", { ascending: true });

    if (memoRows && memoRows.length > 0) {
      const memoIds = memoRows.map((m: { id: string }) => m.id);
      const { data: memoTagRows } = await supabaseClient
        .from("TrainingPageMemoTag")
        .select("training_page_memo_id, UserTag(name, category)")
        .in("training_page_memo_id", memoIds);

      const tagsByMemo = new Map<
        string,
        { name: string; category: string }[]
      >();
      for (const row of (memoTagRows ?? []) as {
        training_page_memo_id: string;
        // biome-ignore lint/suspicious/noExplicitAny: Supabase join result
        UserTag: any;
      }[]) {
        const tag = Array.isArray(row.UserTag) ? row.UserTag[0] : row.UserTag;
        if (!tag?.name) continue;
        const list = tagsByMemo.get(row.training_page_memo_id) ?? [];
        list.push({ name: tag.name, category: tag.category ?? "" });
        tagsByMemo.set(row.training_page_memo_id, list);
      }

      memos = memoRows.map(
        (m: { id: string; content: string; sort_order: number }) => ({
          content: m.content,
          sort_order: m.sort_order,
          tags: tagsByMemo.get(m.id) ?? [],
        }),
      );
    }
  }

  return {
    id: pageData.id,
    title: pageData.title,
    content: pageData.content,
    content_mode: contentMode,
    // biome-ignore lint/suspicious/noExplicitAny: Supabase join result
    tags: (pageTagsData ?? []).map((row: any) => ({
      name: row.UserTag?.name ?? "",
      category: row.UserTag?.category ?? "",
    })),
    memos,
  };
};

/**
 * 公開稽古記録フィードを取得する（is_public=true の TrainingPage）
 */
export const getPublicTrainingPages = async (
  supabaseClient: SupabaseClient,
  limit: number,
  offset: number,
): Promise<{
  pages: {
    id: string;
    title: string;
    content: string;
    user_id: string;
    is_public: boolean;
    created_at: string;
    User: {
      username: string;
      profile_image_url: string | null;
      dojo_style_name: string | null;
      aikido_rank: string | null;
    };
  }[];
  total_count: number;
}> => {
  const { data, count, error } = await supabaseClient
    .from("TrainingPage")
    .select(
      "id, title, content, user_id, is_public, created_at, User!inner(username, profile_image_url, dojo_style_name, aikido_rank)",
      { count: "exact" },
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`公開稽古記録の取得に失敗しました: ${error.message}`);
  }

  return {
    // biome-ignore lint/suspicious/noExplicitAny: Supabase join result
    pages: (data ?? []) as any[],
    total_count: count ?? 0,
  };
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
    is_favorited: boolean;
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
      .or(
        `is_deleted.eq.false,updated_at.gte.${new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()}`,
      )
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

  // 返信の is_favorited 判定用: viewerがお気に入りしている返信IDを一括取得
  const replyIds = (repliesResult.data ?? []).map(
    // biome-ignore lint/suspicious/noExplicitAny: Supabase join result
    (row: any) => row.id as string,
  );
  const favoritedReplyIds = new Set<string>();
  if (replyIds.length > 0) {
    const { data: replyFavs } = await supabaseClient
      .from("SocialFavorite")
      .select("reply_id")
      .in("reply_id", replyIds)
      .eq("user_id", viewerId);
    for (const fav of replyFavs ?? []) {
      if (fav.reply_id) favoritedReplyIds.add(fav.reply_id);
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Supabase join result
  const replies = (repliesResult.data ?? []).map((row: any) => ({
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    content: row.content,
    is_deleted: row.is_deleted,
    favorite_count: row.favorite_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: {
      id: row.User?.id ?? row.user_id,
      username: row.User?.username ?? "",
      profile_image_url: row.User?.profile_image_url ?? null,
    },
    is_favorited: favoritedReplyIds.has(row.id),
  }));

  // training_record の場合、PageAttachment をフォールバックとして取得
  let finalAttachments = attachmentsResult.data ?? [];
  if (
    finalAttachments.length === 0 &&
    post.post_type === "training_record" &&
    post.source_page_id
  ) {
    const { data: pageAtts } = await supabaseClient
      .from("PageAttachment")
      .select(
        "id, page_id, type, url, thumbnail_url, original_filename, sort_order",
      )
      .eq("page_id", post.source_page_id)
      .order("sort_order", { ascending: true });
    finalAttachments = (pageAtts ?? []).map(
      (pa: {
        id: string;
        page_id: string;
        type: string;
        url: string;
        thumbnail_url: string | null;
        original_filename: string | null;
        sort_order: number;
      }) => ({
        id: pa.id,
        post_id: postId,
        user_id: post.user_id,
        type: pa.type,
        url: pa.url,
        thumbnail_url: pa.thumbnail_url,
        original_filename: pa.original_filename,
        file_size_bytes: null,
        sort_order: pa.sort_order,
        created_at: "",
      }),
    );
  }

  return {
    post,
    attachments: finalAttachments,
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

/**
 * 未認証ユーザー向けの投稿詳細取得（お気に入り判定なし）
 */
export const getSocialPostWithDetailsPublic = async (
  supabaseClient: SupabaseClient,
  postId: string,
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
    is_favorited: boolean;
  })[];
  is_favorited: boolean;
} | null> => {
  const post = await getSocialPostById(supabaseClient, postId);
  if (!post) return null;

  const [attachmentsResult, tagsResult, authorResult, repliesResult] =
    await Promise.all([
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
        .or(
          `is_deleted.eq.false,updated_at.gte.${new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()}`,
        )
        .order("created_at", { ascending: true }),
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
    favorite_count: row.favorite_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: {
      id: row.User?.id ?? row.user_id,
      username: row.User?.username ?? "",
      profile_image_url: row.User?.profile_image_url ?? null,
    },
    is_favorited: false,
  }));

  // training_record の場合、PageAttachment をフォールバックとして取得
  let finalAttachments = attachmentsResult.data ?? [];
  if (
    finalAttachments.length === 0 &&
    post.post_type === "training_record" &&
    post.source_page_id
  ) {
    const { data: pageAtts } = await supabaseClient
      .from("PageAttachment")
      .select(
        "id, page_id, type, url, thumbnail_url, original_filename, sort_order",
      )
      .eq("page_id", post.source_page_id)
      .order("sort_order", { ascending: true });
    finalAttachments = (pageAtts ?? []).map(
      (pa: {
        id: string;
        page_id: string;
        type: string;
        url: string;
        thumbnail_url: string | null;
        original_filename: string | null;
        sort_order: number;
      }) => ({
        id: pa.id,
        post_id: postId,
        user_id: post.user_id,
        type: pa.type,
        url: pa.url,
        thumbnail_url: pa.thumbnail_url,
        original_filename: pa.original_filename,
        file_size_bytes: null,
        sort_order: pa.sort_order,
        created_at: "",
      }),
    );
  }

  return {
    post,
    attachments: finalAttachments,
    tags,
    author: authorResult.data ?? {
      id: post.user_id,
      username: "",
      profile_image_url: null,
      aikido_rank: null,
    },
    replies,
    is_favorited: false,
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

export const getSocialReplyById = async (
  supabaseClient: SupabaseClient,
  replyId: string,
): Promise<SocialReplyRow | null> => {
  const { data, error } = await supabaseClient
    .from("SocialReply")
    .select("*")
    .eq("id", replyId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error) {
    throw new Error(`返信の取得に失敗しました: ${error.message}`);
  }

  return data;
};

export const updateSocialReply = async (
  supabaseClient: SupabaseClient,
  replyId: string,
  userId: string,
  data: { content: string },
): Promise<SocialReplyRow> => {
  const { data: reply, error } = await supabaseClient
    .from("SocialReply")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", replyId)
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .select("*")
    .single();

  if (error) {
    throw new Error(`返信の更新に失敗しました: ${error.message}`);
  }

  return reply;
};

export const softDeleteSocialReply = async (
  supabaseClient: SupabaseClient,
  replyId: string,
  userId: string,
): Promise<void> => {
  const { error } = await supabaseClient
    .from("SocialReply")
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", replyId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`返信の削除に失敗しました: ${error.message}`);
  }
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

export const toggleReplyFavorite = async (
  supabaseClient: SupabaseClient,
  replyId: string,
  userId: string,
): Promise<{ is_favorited: boolean }> => {
  const { data: existing } = await supabaseClient
    .from("SocialFavorite")
    .select("id")
    .eq("reply_id", replyId)
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
    .insert({ reply_id: replyId, user_id: userId });

  if (error) {
    throw new Error(`お気に入り登録に失敗しました: ${error.message}`);
  }

  return { is_favorited: true };
};

export const deleteNotificationByReplyFavorite = async (
  supabaseClient: SupabaseClient,
  replyId: string,
  userId: string,
): Promise<void> => {
  const { error } = await supabaseClient
    .from("Notification")
    .delete()
    .eq("type", "favorite_reply")
    .eq("actor_user_id", userId)
    .eq("reply_id", replyId);

  if (error) {
    console.error("通知の削除に失敗しました:", error);
  }
};

export const getNotifications = async (
  supabaseClient: SupabaseClient,
  userId: string,
  limit: number,
  offset: number,
  typeFilter?: "reply" | "favorite",
): Promise<NotificationRow[]> => {
  let query = supabaseClient
    .from("Notification")
    .select(
      "*, User!Notification_actor_user_id_fkey(id, username, profile_image_url)",
    )
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (typeFilter === "reply") {
    query = query.in("type", ["reply", "reply_to_thread"]);
  } else if (typeFilter === "favorite") {
    query = query.in("type", ["favorite", "favorite_reply"]);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`通知の取得に失敗しました: ${error.message}`);
  }

  return data ?? [];
};

export const getCountInWindow = async (
  supabaseClient: SupabaseClient,
  userId: string,
  table: "SocialPost" | "SocialReply" | "SocialFavorite",
  windowMinutes: number,
): Promise<number> => {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { count, error } = await supabaseClient
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) {
    console.error("Rate limit check error:", error);
    return 0;
  }
  return count ?? 0;
};

export const checkRateLimit = async (
  supabaseClient: SupabaseClient,
  userId: string,
  table: "SocialPost" | "SocialReply" | "SocialFavorite",
  windowMinutes: number,
  maxCount: number,
): Promise<boolean> => {
  const count = await getCountInWindow(
    supabaseClient,
    userId,
    table,
    windowMinutes,
  );
  return count >= maxCount;
};

export const markNotificationsRead = async (
  supabaseClient: SupabaseClient,
  userId: string,
  ids?: string[],
  markAll?: boolean,
  postId?: string,
): Promise<void> => {
  let query = supabaseClient
    .from("Notification")
    .update({ is_read: true })
    .eq("recipient_user_id", userId)
    .eq("is_read", false);

  if (postId) {
    query = query.eq("post_id", postId);
  } else if (!markAll && ids && ids.length > 0) {
    query = query.in("id", ids);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`通知の既読化に失敗しました: ${error.message}`);
  }
};

export const getUnreadNotificationCount = async (
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<number> => {
  const { count, error } = await supabaseClient
    .from("Notification")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", userId)
    .eq("is_read", false)
    .in("type", ["reply", "reply_to_thread"]);
  if (error) throw new Error(`未読通知数の取得に失敗: ${error.message}`);
  return count ?? 0;
};

export const getUnreadNotificationPostIds = async (
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<string[]> => {
  const { data, error } = await supabaseClient
    .from("Notification")
    .select("post_id")
    .eq("recipient_user_id", userId)
    .eq("is_read", false)
    .in("type", ["reply", "reply_to_thread"])
    .not("post_id", "is", null);
  if (error) throw new Error(`未読通知投稿IDの取得に失敗: ${error.message}`);
  return [...new Set((data ?? []).map((n) => n.post_id as string))];
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
    hashtag?: string;
    post_type?: "post" | "training_record";
    limit: number;
    offset: number;
  },
): Promise<SocialPostRow[]> => {
  // ハッシュタグ検索の場合:
  //   1. Hashtag テーブル経由（通常のハッシュタグ投稿）
  //   2. SocialPostTag → UserTag 経由（同名の稽古記録タグを持つ投稿）
  // 両方の結果をマージして投稿IDセットを構築する
  let hashtagPostIds: string[] | null = null;
  if (params.hashtag) {
    const [hashtagResult, tagResult] = await Promise.all([
      // 1. ハッシュタグテーブル経由
      (async () => {
        const { data: hashtagData } = await supabaseClient
          .from("Hashtag")
          .select("id")
          .eq("name", params.hashtag)
          .single();
        if (!hashtagData) return [];
        const { data: postHashtags } = await supabaseClient
          .from("SocialPostHashtag")
          .select("post_id")
          .eq("hashtag_id", hashtagData.id);
        return (postHashtags ?? []).map((ph) => ph.post_id);
      })(),
      // 2. 稽古記録タグ（UserTag）経由: 同名のタグを持つ投稿もヒットさせる
      (async () => {
        const { data: userTags } = await supabaseClient
          .from("UserTag")
          .select("id")
          .eq("name", params.hashtag);
        if (!userTags || userTags.length === 0) return [];
        const tagIds = userTags.map((t) => t.id);
        const { data: postTags } = await supabaseClient
          .from("SocialPostTag")
          .select("post_id")
          .in("user_tag_id", tagIds);
        return (postTags ?? []).map((pt) => pt.post_id);
      })(),
    ]);

    // 両方のIDをマージして重複排除
    const mergedIds = [...new Set([...hashtagResult, ...tagResult])];
    if (mergedIds.length === 0) return [];
    hashtagPostIds = mergedIds;
  }

  // キーワード検索の場合: SocialPost.content に加えて、稽古記録の title と
  // タグごとのメモ本文（tag_based ページは content が空）もヒット対象にする。
  // TrainingPage.title / TrainingPageMemo.content にマッチする source_page_id を先に取得。
  let titleMatchPostIds: string[] | null = null;
  if (params.query) {
    const [titlePagesRes, memoPagesRes] = await Promise.all([
      supabaseClient
        .from("TrainingPage")
        .select("id")
        .ilike("title", `%${params.query}%`),
      supabaseClient
        .from("TrainingPageMemo")
        .select("training_page_id")
        .ilike("content", `%${params.query}%`),
    ]);

    const pageIds = [
      ...new Set([
        ...(titlePagesRes.data ?? []).map((p: { id: string }) => p.id),
        ...(memoPagesRes.data ?? []).map(
          (m: { training_page_id: string }) => m.training_page_id,
        ),
      ]),
    ];

    if (pageIds.length > 0) {
      const { data: matchPosts } = await supabaseClient
        .from("SocialPost")
        .select("id")
        .eq("is_deleted", false)
        .eq("post_type", "training_record")
        .in("source_page_id", pageIds);
      titleMatchPostIds = (matchPosts ?? []).map((p) => p.id);
    }
  }

  // content 検索クエリ
  let dbQuery = supabaseClient
    .from("SocialPost")
    .select("*, User!inner(id, aikido_rank, dojo_style_id, publicity_setting)")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (hashtagPostIds) {
    dbQuery = dbQuery.in("id", hashtagPostIds);
  }

  if (params.post_type) {
    dbQuery = dbQuery.eq("post_type", params.post_type);
  }

  if (params.dojo_name) {
    dbQuery = dbQuery.ilike("author_dojo_name", `%${params.dojo_name}%`);
  }

  if (params.rank) {
    dbQuery = dbQuery.eq("User.aikido_rank", params.rank);
  }

  // query 検索: content OR title のどちらかにマッチ
  if (params.query && titleMatchPostIds && titleMatchPostIds.length > 0) {
    // content にマッチする投稿と title にマッチする投稿を OR で取得
    dbQuery = dbQuery.or(
      `content.ilike.%${params.query}%,id.in.(${titleMatchPostIds.join(",")})`,
    );
  } else if (params.query) {
    dbQuery = dbQuery.ilike("content", `%${params.query}%`);
  }

  dbQuery = dbQuery.range(params.offset, params.offset + params.limit - 1);

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`投稿検索に失敗しました: ${error.message}`);
  }

  // 公開範囲フィルタ（User.publicity_setting + UserPublicityDojo ベース）
  // biome-ignore lint/suspicious/noExplicitAny: Supabase join result
  const closedOwnerIds = (data ?? [])
    .filter((post: any) => post.User?.publicity_setting === "closed")
    .map((post: any) => post.user_id as string);
  const publicityMap = await getUsersPublicityDojosBatch(supabaseClient, [
    ...new Set(closedOwnerIds),
  ]);

  // biome-ignore lint/suspicious/noExplicitAny: Supabase join result
  const filtered = (data ?? []).filter((post: any) => {
    const publicity = post.User?.publicity_setting;
    if (publicity === "public") return true;
    if (publicity === "closed" && viewerDojoStyleId) {
      const allowedDojos = publicityMap.get(post.user_id);
      return allowedDojos?.has(viewerDojoStyleId) ?? false;
    }
    if (post.user_id === viewerId) return true;
    return false;
  });

  return filtered;
};

// 単一ユーザーの公開対象道場ID配列を取得
export const getUserPublicityDojos = async (
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<string[]> => {
  const { data } = await supabaseClient
    .from("UserPublicityDojo")
    .select("dojo_style_id")
    .eq("user_id", userId);
  return (data ?? []).map((d) => d.dojo_style_id);
};

// 複数ユーザーの公開対象道場をバッチ取得（N+1回避）
export const getUsersPublicityDojosBatch = async (
  supabaseClient: SupabaseClient,
  userIds: string[],
): Promise<Map<string, Set<string>>> => {
  const map = new Map<string, Set<string>>();
  if (userIds.length === 0) return map;

  const { data } = await supabaseClient
    .from("UserPublicityDojo")
    .select("user_id, dojo_style_id")
    .in("user_id", userIds);

  for (const row of data ?? []) {
    if (!map.has(row.user_id)) {
      map.set(row.user_id, new Set());
    }
    map.get(row.user_id)?.add(row.dojo_style_id);
  }
  return map;
};

export const getSocialProfile = async (
  supabaseClient: SupabaseClient,
  targetUsername: string,
  viewerId: string,
  viewerDojoStyleId: string | null,
): Promise<{
  is_restricted: boolean;
  user: {
    id: string;
    username: string;
    profile_image_url: string | null;
    bio: string | null;
    aikido_rank: string | null;
    dojo_style_name: string | null;
    publicity_setting: string | null;
    full_name: string | null;
  } | null;
  // biome-ignore lint/suspicious/noExplicitAny: enrichSocialPosts の返り値型は動的に構築される
  posts: any[];
  total_favorites?: number;
  total_posts_count: number;
  total_training_records_count: number;
  public_pages: { id: string; title: string; created_at: string }[];
  is_blocked?: boolean;
  is_blocked_by_target?: boolean;
} | null> => {
  const { data: user, error: userError } = await supabaseClient
    .from("User")
    .select(
      "id, username, profile_image_url, bio, aikido_rank, dojo_style_name, dojo_style_id, publicity_setting, full_name",
    )
    .eq("username", targetUsername)
    .single();

  if (userError || !user) {
    return null;
  }

  const targetUserId = user.id;

  // 他ユーザーの非公開プロフィールは制限付きレスポンスを返す
  const publicity = user.publicity_setting;
  if (targetUserId !== viewerId) {
    if (publicity === "private") {
      return {
        is_restricted: true,
        user: null,
        posts: [],
        total_posts_count: 0,
        total_training_records_count: 0,
        public_pages: [],
      };
    }
    if (publicity === "closed") {
      const allowedDojos = await getUserPublicityDojos(
        supabaseClient,
        targetUserId,
      );
      if (!viewerDojoStyleId || !allowedDojos.includes(viewerDojoStyleId)) {
        return {
          is_restricted: true,
          user: null,
          posts: [],
          total_posts_count: 0,
          total_training_records_count: 0,
          public_pages: [],
        };
      }
    }
  }

  // 投稿フィード・投稿タイプ別カウント・公開稽古記録 + ブロック状態（双方向）を並列取得
  const [
    postsResult,
    totalPostsCountResult,
    totalTrainingRecordsCountResult,
    publicPagesResult,
    blockedByViewerResult,
    blockedByTargetResult,
  ] = await Promise.all([
    supabaseClient
      .from("SocialPost")
      .select("*")
      .eq("user_id", targetUserId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseClient
      .from("SocialPost")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId)
      .eq("is_deleted", false)
      .eq("post_type", "post"),
    supabaseClient
      .from("SocialPost")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId)
      .eq("is_deleted", false)
      .eq("post_type", "training_record"),
    supabaseClient
      .from("TrainingPage")
      .select("id, title, created_at")
      .eq("user_id", targetUserId)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20),
    // ブロック状態（自分→相手）
    targetUserId !== viewerId
      ? supabaseClient
          .from("UserBlock")
          .select("id")
          .eq("blocker_user_id", viewerId)
          .eq("blocked_user_id", targetUserId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    // ブロック状態（相手→自分）
    targetUserId !== viewerId
      ? supabaseClient
          .from("UserBlock")
          .select("id")
          .eq("blocker_user_id", targetUserId)
          .eq("blocked_user_id", viewerId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const posts = postsResult.data;
  const publicPages = publicPagesResult.data;
  const isBlockedByViewer = !!blockedByViewerResult.data;
  const isBlockedByTarget = !!blockedByTargetResult.data;

  // ブロック関係がある場合は投稿配列を空にする（自分自身のプロフィールは判定対象外）
  // 投稿データをエンリッチ（author, attachments, tags, hashtags, is_favorited 等を付与）
  const enrichedPosts =
    isBlockedByViewer || isBlockedByTarget
      ? []
      : await enrichSocialPosts(supabaseClient, posts ?? [], viewerId);

  const result: {
    is_restricted: boolean;
    user: typeof user;
    // biome-ignore lint/suspicious/noExplicitAny: enrichSocialPosts の返り値型は動的に構築される
    posts: any[];
    total_favorites?: number;
    total_posts_count: number;
    total_training_records_count: number;
    public_pages: { id: string; title: string; created_at: string }[];
    is_blocked?: boolean;
    is_blocked_by_target?: boolean;
  } = {
    is_restricted: false,
    user,
    posts: enrichedPosts,
    total_posts_count: totalPostsCountResult.count ?? 0,
    total_training_records_count: totalTrainingRecordsCountResult.count ?? 0,
    public_pages: publicPages ?? [],
    is_blocked: isBlockedByViewer,
    is_blocked_by_target: isBlockedByTarget,
  };

  // 本人のみお気に入りされた数を返却（投稿＋返信の合算）
  if (targetUserId === viewerId) {
    const [postFavRes, replyFavRes] = await Promise.all([
      supabaseClient
        .from("SocialPost")
        .select("favorite_count")
        .eq("user_id", targetUserId)
        .eq("is_deleted", false),
      supabaseClient
        .from("SocialReply")
        .select("favorite_count")
        .eq("user_id", targetUserId)
        .eq("is_deleted", false),
    ]);

    const postSum = (postFavRes.data ?? []).reduce(
      (sum, p) => sum + (p.favorite_count ?? 0),
      0,
    );
    const replySum = (replyFavRes.data ?? []).reduce(
      (sum, r) => sum + (r.favorite_count ?? 0),
      0,
    );
    result.total_favorites = postSum + replySum;
  }

  return result;
};

export const getPublicSocialProfile = async (
  supabaseClient: SupabaseClient,
  targetUsername: string,
): Promise<{
  is_restricted: boolean;
  user: {
    id: string;
    username: string;
    profile_image_url: string | null;
    bio: string | null;
    aikido_rank: string | null;
    dojo_style_name: string | null;
    publicity_setting: string | null;
    full_name: string | null;
  } | null;
  // biome-ignore lint/suspicious/noExplicitAny: enrichSocialPosts の返り値型は動的に構築される
  posts: any[];
  total_posts_count: number;
  total_training_records_count: number;
  public_pages: { id: string; title: string; created_at: string }[];
} | null> => {
  const { data: user, error: userError } = await supabaseClient
    .from("User")
    .select(
      "id, username, profile_image_url, bio, aikido_rank, dojo_style_name, publicity_setting, full_name",
    )
    .eq("username", targetUsername)
    .single();

  if (userError || !user) {
    return null;
  }

  // 未ログインユーザーは publicity_setting === "public" のプロフィールのみ閲覧可
  if (user.publicity_setting !== "public") {
    return {
      is_restricted: true,
      user: null,
      posts: [],
      total_posts_count: 0,
      total_training_records_count: 0,
      public_pages: [],
    };
  }

  const targetUserId = user.id;

  const [
    postsResult,
    totalPostsCountResult,
    totalTrainingRecordsCountResult,
    publicPagesResult,
  ] = await Promise.all([
    supabaseClient
      .from("SocialPost")
      .select("*")
      .eq("user_id", targetUserId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseClient
      .from("SocialPost")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId)
      .eq("is_deleted", false)
      .eq("post_type", "post"),
    supabaseClient
      .from("SocialPost")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId)
      .eq("is_deleted", false)
      .eq("post_type", "training_record"),
    supabaseClient
      .from("TrainingPage")
      .select("id, title, created_at")
      .eq("user_id", targetUserId)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const posts = postsResult.data ?? [];
  const enrichedPosts = await enrichSocialPosts(supabaseClient, posts, "");

  return {
    is_restricted: false,
    user,
    posts: enrichedPosts,
    total_posts_count: totalPostsCountResult.count ?? 0,
    total_training_records_count: totalTrainingRecordsCountResult.count ?? 0,
    public_pages: publicPagesResult.data ?? [],
  };
};

/**
 * 投稿一覧をバッチクエリでエンリッチする（N+1 解消版）
 * author, attachments, tags, is_favorited を一括取得して結合
 */
export const enrichSocialPosts = async (
  supabaseClient: SupabaseClient,
  posts: SocialPostRow[],
  viewerUserId: string,
) => {
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const authorIds = [...new Set(posts.map((p) => p.user_id))];
  const sourcePageIds = posts
    .filter((p) => p.post_type === "training_record" && p.source_page_id)
    .map((p) => p.source_page_id)
    .filter((id): id is string => !!id);

  const favoritesQuery = viewerUserId
    ? supabaseClient
        .from("SocialFavorite")
        .select("post_id")
        .in("post_id", postIds)
        .eq("user_id", viewerUserId)
    : Promise.resolve({ data: [] as { post_id: string }[], error: null });

  // バッチクエリを並列実行（N+1 → 固定クエリ数）
  const [
    authorsResult,
    attachmentsResult,
    tagsResult,
    favoritesResult,
    hashtagsResult,
  ] = await Promise.all([
    supabaseClient
      .from("User")
      .select("id, username, profile_image_url, aikido_rank")
      .in("id", authorIds),
    supabaseClient
      .from("SocialPostAttachment")
      .select("*")
      .in("post_id", postIds)
      .order("sort_order", { ascending: true }),
    supabaseClient
      .from("SocialPostTag")
      .select("post_id, user_tag_id, UserTag(id, name, category)")
      .in("post_id", postIds),
    favoritesQuery,
    supabaseClient
      .from("SocialPostHashtag")
      .select("post_id, hashtag_id, Hashtag(id, name)")
      .in("post_id", postIds),
  ]);

  // source_page のクエリも並列実行
  // biome-ignore lint/suspicious/noExplicitAny: Supabase query results
  let sourcePagesData: any[] = [];
  // biome-ignore lint/suspicious/noExplicitAny: Supabase query results
  let sourcePageTagsData: any[] = [];
  // biome-ignore lint/suspicious/noExplicitAny: Supabase query results
  let pageAttachmentsData: any[] = [];
  if (sourcePageIds.length > 0) {
    const [pagesRes, pageTagsRes, pageAttRes] = await Promise.all([
      supabaseClient
        .from("TrainingPage")
        .select("id, title")
        .in("id", sourcePageIds),
      supabaseClient
        .from("TrainingPageTag")
        .select("training_page_id, UserTag(name, category)")
        .in("training_page_id", sourcePageIds),
      supabaseClient
        .from("PageAttachment")
        .select(
          "id, page_id, type, url, thumbnail_url, original_filename, sort_order",
        )
        .in("page_id", sourcePageIds)
        .order("sort_order", { ascending: true }),
    ]);
    sourcePagesData = pagesRes.data ?? [];
    sourcePageTagsData = pageTagsRes.data ?? [];
    pageAttachmentsData = pageAttRes.data ?? [];
  }

  // ルックアップマップを構築
  const authorMap = new Map((authorsResult.data ?? []).map((a) => [a.id, a]));

  // biome-ignore lint/suspicious/noExplicitAny: Supabase query results
  const pageAttachmentMap = new Map<string, any[]>();
  for (const att of pageAttachmentsData) {
    const list = pageAttachmentMap.get(att.page_id) ?? [];
    list.push(att);
    pageAttachmentMap.set(att.page_id, list);
  }

  const attachmentMap = new Map<string, typeof attachmentsResult.data>();
  for (const att of attachmentsResult.data ?? []) {
    const list = attachmentMap.get(att.post_id) ?? [];
    list.push(att);
    attachmentMap.set(att.post_id, list);
  }

  const tagMap = new Map<
    string,
    { id: string; name: string; category: string }[]
  >();
  for (const row of tagsResult.data ?? []) {
    // biome-ignore lint/suspicious/noExplicitAny: Supabase join result
    const r = row as any;
    const list = tagMap.get(r.post_id) ?? [];
    list.push({
      id: r.UserTag?.id ?? r.user_tag_id,
      name: r.UserTag?.name ?? "",
      category: r.UserTag?.category ?? "",
    });
    tagMap.set(r.post_id, list);
  }

  const favoritedPostIds = new Set(
    (favoritesResult.data ?? []).map((f) => f.post_id),
  );

  const hashtagMap = new Map<string, { id: string; name: string }[]>();
  for (const row of hashtagsResult.data ?? []) {
    // biome-ignore lint/suspicious/noExplicitAny: Supabase join result
    const r = row as any;
    const hashtag = r.Hashtag;
    if (!hashtag?.id || !hashtag?.name) continue;
    const list = hashtagMap.get(r.post_id) ?? [];
    list.push({ id: hashtag.id, name: hashtag.name });
    hashtagMap.set(r.post_id, list);
  }

  // training_record 用: source_page データを構築（既にバッチ取得済み）
  const sourcePageMap = new Map<
    string,
    { title: string; tags: { name: string; category: string }[] }
  >();

  if (sourcePageIds.length > 0) {
    const pagesData = sourcePagesData;
    const pageTagsData = sourcePageTagsData;

    for (const page of pagesData) {
      sourcePageMap.set(page.id, { title: page.title, tags: [] });
    }

    for (const row of pageTagsData) {
      const entry = sourcePageMap.get(row.training_page_id);
      if (entry && row.UserTag) {
        entry.tags.push({
          name: row.UserTag.name,
          category: row.UserTag.category,
        });
      }
    }
  }

  // 結合
  return posts.map((post) => {
    const sourcePage = post.source_page_id
      ? sourcePageMap.get(post.source_page_id)
      : undefined;
    return {
      ...post,
      favorite_count:
        post.user_id === viewerUserId ? post.favorite_count : undefined,
      author: authorMap.get(post.user_id) ?? {
        id: post.user_id,
        username: "",
        profile_image_url: null,
        aikido_rank: null,
      },
      attachments: (() => {
        const postAtts = attachmentMap.get(post.id) ?? [];
        if (postAtts.length > 0) return postAtts;
        if (!post.source_page_id) return [];
        return (pageAttachmentMap.get(post.source_page_id) ?? []).map(
          (pa: {
            id: string;
            type: string;
            url: string;
            thumbnail_url: string | null;
            original_filename: string | null;
            sort_order: number;
          }) => ({
            id: pa.id,
            post_id: post.id,
            user_id: post.user_id,
            type: pa.type,
            url: pa.url,
            thumbnail_url: pa.thumbnail_url,
            original_filename: pa.original_filename,
            file_size_bytes: null,
            sort_order: pa.sort_order,
            created_at: "",
          }),
        );
      })(),
      tags: tagMap.get(post.id) ?? [],
      hashtags: hashtagMap.get(post.id) ?? [],
      is_favorited: favoritedPostIds.has(post.id),
      source_page_title: sourcePage?.title ?? null,
      source_page_tags: sourcePage?.tags ?? [],
    };
  });
};

// ============================================
// ハッシュタグ関連
// ============================================

/**
 * ハッシュタグ名の配列を受け取り、存在すれば取得・なければ作成して返す
 */
export const upsertHashtags = async (
  supabaseClient: SupabaseClient,
  names: string[],
): Promise<{ id: string; name: string }[]> => {
  if (names.length === 0) return [];

  // 既存のハッシュタグを取得
  const { data: existing } = await supabaseClient
    .from("Hashtag")
    .select("id, name")
    .in("name", names);

  const existingMap = new Map((existing ?? []).map((h) => [h.name, h]));

  // 未登録のハッシュタグを一括作成
  const newNames = names.filter((n) => !existingMap.has(n));
  if (newNames.length > 0) {
    const { data: inserted, error } = await supabaseClient
      .from("Hashtag")
      .insert(newNames.map((name) => ({ name })))
      .select("id, name");

    if (error) {
      throw new Error(`ハッシュタグの作成に失敗しました: ${error.message}`);
    }

    for (const h of inserted ?? []) {
      existingMap.set(h.name, h);
    }
  }

  return names
    .map((n) => existingMap.get(n))
    .filter((h): h is { id: string; name: string } => !!h);
};

/**
 * 投稿にハッシュタグを紐付ける（一括INSERT）
 */
export const createSocialPostHashtags = async (
  supabaseClient: SupabaseClient,
  postId: string,
  hashtagIds: string[],
): Promise<void> => {
  if (hashtagIds.length === 0) return;

  const { error } = await supabaseClient
    .from("SocialPostHashtag")
    .insert(hashtagIds.map((hashtag_id) => ({ post_id: postId, hashtag_id })));

  if (error) {
    throw new Error(`ハッシュタグの紐付けに失敗しました: ${error.message}`);
  }
};

/**
 * 投稿のハッシュタグを更新する（既存を削除して再作成）
 */
export const updateSocialPostHashtags = async (
  supabaseClient: SupabaseClient,
  postId: string,
  hashtagIds: string[],
): Promise<void> => {
  // 既存の紐付けを削除
  await supabaseClient.from("SocialPostHashtag").delete().eq("post_id", postId);

  // 新しい紐付けを作成
  if (hashtagIds.length > 0) {
    await createSocialPostHashtags(supabaseClient, postId, hashtagIds);
  }
};

/**
 * 直近 30 日間のトレンドハッシュタグを取得する。
 * 集計は Supabase RPC `get_trending_hashtags` (migrations/029) に委譲し、
 * 同率タイは全件含めて top_n 位までを返す既存仕様を再現する。
 */
export const getTrendingHashtags = async (
  supabaseClient: SupabaseClient,
  limit: number,
): Promise<{ name: string; count: number }[]> => {
  const { data, error } = await supabaseClient.rpc("get_trending_hashtags", {
    days_back: 30,
    top_n: limit,
  });

  if (error) {
    throw new Error(
      `トレンドハッシュタグの取得に失敗しました: ${error.message}`,
    );
  }

  return (data ?? []).map(
    (row: { name: string; count: number | string | bigint }) => ({
      name: row.name,
      count: Number(row.count),
    }),
  );
};

// ============================================================
// タイトルテンプレート CRUD
// ============================================================

export const getTitleTemplates = async (
  userId: string,
): Promise<TitleTemplateRow[]> => {
  const { data, error } = await supabase
    .from("TitleTemplate")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`タイトルテンプレート取得に失敗しました: ${error.message}`);
  }

  return data || [];
};

export const createTitleTemplate = async (
  userId: string,
  templateText: string,
  dateFormat: string | null,
  existingTemplates?: TitleTemplateRow[],
): Promise<TitleTemplateRow> => {
  let maxOrder = 0;

  if (existingTemplates) {
    maxOrder = existingTemplates.reduce(
      (max, row) => Math.max(max, row.sort_order ?? 0),
      0,
    );
  } else {
    const { data, error: fetchError } = await supabase
      .from("TitleTemplate")
      .select("sort_order")
      .eq("user_id", userId);

    if (fetchError) {
      throw new Error(`並び順情報の取得に失敗しました: ${fetchError.message}`);
    }

    maxOrder = (data ?? []).reduce(
      (max, row) => Math.max(max, row.sort_order ?? 0),
      0,
    );
  }

  const { data: newTemplate, error } = await supabase
    .from("TitleTemplate")
    .insert([
      {
        user_id: userId,
        template_text: templateText,
        date_format: dateFormat,
        sort_order: maxOrder + 1,
        created_at: new Date().toISOString(),
      },
    ])
    .select("*")
    .single();

  if (error) {
    throw new Error(`タイトルテンプレート作成に失敗しました: ${error.message}`);
  }

  return newTemplate;
};

export const deleteTitleTemplate = async (
  templateId: string,
  userId: string,
): Promise<TitleTemplateRow | null> => {
  const { data, error } = await supabase
    .from("TitleTemplate")
    .delete()
    .eq("id", templateId)
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`タイトルテンプレート削除に失敗しました: ${error.message}`);
  }

  return data;
};

// ===================================
// カテゴリ関連関数
// ===================================

const MAX_CATEGORIES = 5;

// カテゴリ一覧取得
export const getUserCategories = async (
  userId: string,
): Promise<UserCategoryRow[]> => {
  const { data, error } = await supabase
    .from("UserCategory")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`カテゴリ取得に失敗しました: ${error.message}`);
  }

  return data || [];
};

// カテゴリ数取得（上限チェック用）
export const getUserCategoryCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from("UserCategory")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`カテゴリ数取得に失敗しました: ${error.message}`);
  }

  return count ?? 0;
};

// slug生成: カテゴリ名からslugを生成（重複時はランダムサフィックス付与）
const generateCategorySlug = async (
  userId: string,
  name: string,
): Promise<string> => {
  // 英数字のみの場合はそのまま小文字化、それ以外はランダム文字列
  const base = /^[a-zA-Z0-9]+$/.test(name)
    ? name.toLowerCase()
    : `custom_${Date.now().toString(36)}`;

  const { data: existing } = await supabase
    .from("UserCategory")
    .select("slug")
    .eq("user_id", userId)
    .eq("slug", base)
    .maybeSingle();

  if (!existing) {
    return base;
  }

  return `${base}_${Date.now().toString(36)}`;
};

// カテゴリ作成
export const createUserCategory = async (
  userId: string,
  name: string,
): Promise<UserCategoryRow> => {
  // 上限チェック
  const count = await getUserCategoryCount(userId);
  if (count >= MAX_CATEGORIES) {
    throw new Error(
      `カテゴリは最大${MAX_CATEGORIES}個までです。現在${count}個登録されています`,
    );
  }

  // sort_order自動採番
  const { data: maxOrderRow } = await supabase
    .from("UserCategory")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (maxOrderRow?.sort_order ?? 0) + 1;

  const slug = await generateCategorySlug(userId, name);

  const { data, error } = await supabase
    .from("UserCategory")
    .insert({
      user_id: userId,
      name,
      slug,
      sort_order: nextSortOrder,
      is_default: false,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`同じ名前のカテゴリが既に存在します`);
    }
    throw new Error(`カテゴリ作成に失敗しました: ${error.message}`);
  }

  return data;
};

// カテゴリ名更新（+ 所属UserTagのcategoryも一括更新）
export const updateUserCategory = async (
  categoryId: string,
  userId: string,
  newName: string,
): Promise<UserCategoryRow> => {
  // カテゴリ取得
  const { data: category, error: fetchError } = await supabase
    .from("UserCategory")
    .select("*")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !category) {
    throw new Error("カテゴリが見つかりません");
  }

  const oldName = category.name;

  // カテゴリ名を更新
  const { data: updated, error: updateError } = await supabase
    .from("UserCategory")
    .update({ name: newName })
    .eq("id", categoryId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (updateError) {
    if (updateError.code === "23505") {
      throw new Error(`同じ名前のカテゴリが既に存在します`);
    }
    throw new Error(`カテゴリ更新に失敗しました: ${updateError.message}`);
  }

  // 所属UserTagのcategoryを一括更新
  const { error: tagUpdateError } = await supabase
    .from("UserTag")
    .update({ category: newName })
    .eq("user_id", userId)
    .eq("category", oldName);

  if (tagUpdateError) {
    throw new Error(
      `タグのカテゴリ更新に失敗しました: ${tagUpdateError.message}`,
    );
  }

  return updated;
};

// カテゴリ削除（所属タグも連鎖削除）
export const deleteUserCategory = async (
  categoryId: string,
  userId: string,
): Promise<void> => {
  // カテゴリ取得
  const { data: category, error: fetchError } = await supabase
    .from("UserCategory")
    .select("*")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !category) {
    throw new Error("カテゴリが見つかりません");
  }

  // 所属タグのID一覧を取得
  const { data: tags } = await supabase
    .from("UserTag")
    .select("id")
    .eq("user_id", userId)
    .eq("category", category.name);

  if (tags && tags.length > 0) {
    const tagIds = tags.map((t) => t.id);

    // TrainingPageTagの関連を削除
    const { error: detachError } = await supabase
      .from("TrainingPageTag")
      .delete()
      .in("user_tag_id", tagIds);

    if (detachError) {
      throw new Error(`タグ関連付け削除に失敗しました: ${detachError.message}`);
    }

    // 所属UserTagを削除
    const { error: tagDeleteError } = await supabase
      .from("UserTag")
      .delete()
      .eq("user_id", userId)
      .eq("category", category.name);

    if (tagDeleteError) {
      throw new Error(`タグ削除に失敗しました: ${tagDeleteError.message}`);
    }
  }

  // カテゴリ自体を削除
  const { error: deleteError } = await supabase
    .from("UserCategory")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(`カテゴリ削除に失敗しました: ${deleteError.message}`);
  }
};

// デフォルト3カテゴリ初期化
export const initializeUserCategories = async (
  userId: string,
): Promise<UserCategoryRow[]> => {
  const defaults = [
    { name: "取り", slug: "tori", sort_order: 1 },
    { name: "受け", slug: "uke", sort_order: 2 },
    { name: "技", slug: "waza", sort_order: 3 },
  ];

  const { data, error } = await supabase
    .from("UserCategory")
    .upsert(
      defaults.map((d) => ({
        user_id: userId,
        name: d.name,
        slug: d.slug,
        sort_order: d.sort_order,
        is_default: true,
      })),
      { onConflict: "user_id,name" },
    )
    .select("*");

  if (error) {
    throw new Error(`カテゴリ初期化に失敗しました: ${error.message}`);
  }

  return data || [];
};

// ============================================
// UserBlock（ユーザーブロック機能）
// Apple App Review Guideline 1.2 (UGC) 対応
// ============================================

export interface UserBlockRow {
  id: string;
  blocker_user_id: string;
  blocked_user_id: string;
  created_at: string;
}

export interface UserBlockWithBlockedUser extends UserBlockRow {
  blocked_user: {
    id: string;
    username: string;
    profile_image_url: string | null;
  };
}

/**
 * ブロック作成。既に存在する場合は ALREADY_BLOCKED を throw。
 */
export const createUserBlock = async (
  supabaseClient: SupabaseClient,
  blockerUserId: string,
  blockedUserId: string,
): Promise<UserBlockRow> => {
  const { data: existing } = await supabaseClient
    .from("UserBlock")
    .select("id")
    .eq("blocker_user_id", blockerUserId)
    .eq("blocked_user_id", blockedUserId)
    .maybeSingle();

  if (existing) {
    throw new Error("ALREADY_BLOCKED");
  }

  const { data, error } = await supabaseClient
    .from("UserBlock")
    .insert({
      blocker_user_id: blockerUserId,
      blocked_user_id: blockedUserId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`ブロックの作成に失敗しました: ${error.message}`);
  }

  return data;
};

/**
 * ブロック解除（指定ペアの行が無くてもエラーにしない）。
 */
export const deleteUserBlock = async (
  supabaseClient: SupabaseClient,
  blockerUserId: string,
  blockedUserId: string,
): Promise<void> => {
  const { error } = await supabaseClient
    .from("UserBlock")
    .delete()
    .eq("blocker_user_id", blockerUserId)
    .eq("blocked_user_id", blockedUserId);

  if (error) {
    throw new Error(`ブロック解除に失敗しました: ${error.message}`);
  }
};

/**
 * 単一ペアのブロック状態確認。エラー時は false を返す（プロフィール表示など UI のフォールバックを優先）。
 */
export const isUserBlocked = async (
  supabaseClient: SupabaseClient,
  blockerUserId: string,
  blockedUserId: string,
): Promise<boolean> => {
  const { data, error } = await supabaseClient
    .from("UserBlock")
    .select("id")
    .eq("blocker_user_id", blockerUserId)
    .eq("blocked_user_id", blockedUserId)
    .maybeSingle();

  if (error) {
    console.error("ブロック状態確認エラー:", error);
    return false;
  }

  return !!data;
};

/**
 * 自分がブロックしているユーザーの一覧を取得。
 * UserBlock の FK は auth.users を参照しているため Supabase の自動 JOIN は使えず、
 * 2 段階クエリで User テーブルから username / profile_image_url を取得して合成する。
 */
export const getUserBlocks = async (
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<UserBlockWithBlockedUser[]> => {
  const { data: blocks, error } = await supabaseClient
    .from("UserBlock")
    .select("id, blocker_user_id, blocked_user_id, created_at")
    .eq("blocker_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`ブロック一覧の取得に失敗しました: ${error.message}`);
  }

  if (!blocks || blocks.length === 0) {
    return [];
  }

  const blockedIds = blocks.map((b) => b.blocked_user_id);
  const { data: users } = await supabaseClient
    .from("User")
    .select("id, username, profile_image_url")
    .in("id", blockedIds);

  const userMap = new Map(
    (users ?? []).map((u) => [
      u.id as string,
      u as {
        id: string;
        username: string;
        profile_image_url: string | null;
      },
    ]),
  );

  return blocks.map((b) => ({
    id: b.id,
    blocker_user_id: b.blocker_user_id,
    blocked_user_id: b.blocked_user_id,
    created_at: b.created_at,
    blocked_user: userMap.get(b.blocked_user_id) ?? {
      id: b.blocked_user_id,
      username: "",
      profile_image_url: null,
    },
  }));
};
