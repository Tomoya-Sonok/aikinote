import { trpcClient } from "@/lib/trpc/client";

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    try {
      // TRPC (Zod) のバリデーションエラーが JSON 文字列で返ってくる場合の対応
      const parsed = JSON.parse(error.message);
      if (Array.isArray(parsed) && parsed[0]?.message) {
        return String(parsed[0].message);
      }
    } catch {
      // JSON形式でない場合はそのまま処理を続ける
    }

    if (typeof error.message === "object") {
      return JSON.stringify(error.message);
    }

    return String(error.message);
  }

  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message: unknown }).message;
    return typeof msg === "string" ? msg : JSON.stringify(msg);
  }

  if (typeof error === "string") {
    return error;
  }

  return fallback;
};

type QueryCacheEntry = {
  expiresAt: number;
  value: unknown;
};

const queryCache = new Map<string, QueryCacheEntry>();

const CACHE_TTL_MS = {
  pagesList: 30_000,
  pageById: 30_000,
  tagsList: 60_000,
  userInfo: 60_000,
  trainingDatesMonth: 30_000,
  trainingStats: 60_000,
  subscription: 30_000,
  socialFeed: 15_000,
  socialPost: 15_000,
  socialSearch: 15_000,
  socialProfile: 30_000,
  notifications: 10_000,
} as const;

const isBrowser = () => typeof window !== "undefined";

const createCacheKey = (scope: string, input: unknown) => {
  return `${scope}:${JSON.stringify(input)}`;
};

const cachedQuery = async <T>(
  scope: string,
  input: unknown,
  ttlMs: number,
  queryFn: () => Promise<T>,
): Promise<T> => {
  if (!isBrowser()) {
    return queryFn();
  }

  const key = createCacheKey(scope, input);
  const now = Date.now();
  const existing = queryCache.get(key);

  if (existing && existing.expiresAt > now) {
    return existing.value as T;
  }

  const value = await queryFn();
  queryCache.set(key, {
    value,
    expiresAt: now + ttlMs,
  });

  return value;
};

const invalidateQueryCacheByPrefixes = (prefixes: string[]) => {
  if (!isBrowser()) {
    return;
  }

  queryCache.forEach((_, key) => {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      queryCache.delete(key);
    }
  });
};

// ページ作成の型定義（フロントエンド用）
export interface CreatePagePayload {
  title: string;
  tori: string[];
  uke: string[];
  waza: string[];
  content: string;
  user_id: string;
  is_public?: boolean;
  created_at?: string;
}

// ページ作成API関数
export const createPage = async (pageData: CreatePagePayload) => {
  try {
    const response = await trpcClient.pages.create.mutate(pageData);
    invalidateQueryCacheByPrefixes([
      "pages:getList",
      "pages:getById",
      "trainingDates:getMonth",
    ]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "ページの作成に失敗しました"));
  }
};

// ページ一覧取得の引数の型
export interface GetPagesParams {
  userId: string;
  limit?: number;
  offset?: number;
  query?: string;
  tags?: string[];
  startDate?: string;
  endDate?: string;
  sortOrder?: "newest" | "oldest";
}

// ページ一覧取得API関数
export const getPages = async ({
  userId,
  limit,
  offset,
  query,
  tags,
  startDate,
  endDate,
  sortOrder,
}: GetPagesParams) => {
  try {
    const input = {
      userId,
      limit,
      offset,
      query,
      tags,
      startDate,
      endDate,
      sortOrder,
    };

    return await cachedQuery(
      "pages:getList",
      input,
      CACHE_TTL_MS.pagesList,
      async () => trpcClient.pages.getList.query(input),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "ページ一覧の取得に失敗しました"));
  }
};

// ページ詳細取得API関数
export const getPage = async (pageId: string, userId: string) => {
  try {
    const input = { pageId, userId };

    return await cachedQuery(
      "pages:getById",
      input,
      CACHE_TTL_MS.pageById,
      async () => trpcClient.pages.getById.query(input),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "ページ詳細の取得に失敗しました"));
  }
};

// 公開稽古記録フィード取得API
export const getPublicPagesFeed = async (params: {
  limit?: number;
  offset?: number;
}) => {
  try {
    return await trpcClient.pages.getPublicFeed.query(params);
  } catch (error) {
    throw new Error(getErrorMessage(error, "公開稽古記録の取得に失敗しました"));
  }
};

// ページ削除API関数
export const deletePage = async (pageId: string, userId: string) => {
  try {
    const response = await trpcClient.pages.remove.mutate({ pageId, userId });
    invalidateQueryCacheByPrefixes([
      "pages:getList",
      "pages:getById",
      "trainingDates:getMonth",
    ]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "ページ削除に失敗しました"));
  }
};

// ページ添付ファイル一覧取得API関数
export const getAttachments = async (pageId: string) => {
  try {
    const response = await fetch(`/api/page-attachments?page_id=${pageId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "添付ファイルの取得に失敗しました"));
  }
};

// ページ添付ファイル作成API関数
export const createAttachment = async (payload: Record<string, unknown>) => {
  try {
    const response = await fetch("/api/page-attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "添付ファイルの作成に失敗しました"));
  }
};

// タグ関連のAPI関数
export interface CreateTagPayload {
  name: string;
  category: "取り" | "受け" | "技";
  user_id: string;
}

// タグ一覧取得API関数
export const getTags = async (userId: string) => {
  try {
    const input = { userId };

    return await cachedQuery(
      "tags:getList",
      input,
      CACHE_TTL_MS.tagsList,
      async () => trpcClient.tags.getList.query(input),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "タグ一覧の取得に失敗しました"));
  }
};

// タグ作成API関数
export const createTag = async (tagData: CreateTagPayload) => {
  try {
    const response = await trpcClient.tags.create.mutate(tagData);
    invalidateQueryCacheByPrefixes([
      "tags:getList",
      "pages:getList",
      "pages:getById",
    ]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "タグ作成に失敗しました"));
  }
};

export const deleteTag = async (tagId: string, userId: string) => {
  try {
    const response = await trpcClient.tags.remove.mutate({ tagId, userId });
    invalidateQueryCacheByPrefixes([
      "tags:getList",
      "pages:getList",
      "pages:getById",
    ]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "タグ削除に失敗しました"));
  }
};

export interface UpdateTagOrderPayload {
  user_id: string;
  tori: string[];
  uke: string[];
  waza: string[];
}

export const updateTagOrder = async (payload: UpdateTagOrderPayload) => {
  try {
    const response = await trpcClient.tags.updateOrder.mutate(payload);
    invalidateQueryCacheByPrefixes(["tags:getList"]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "タグ順序更新に失敗しました"));
  }
};

// ページ更新の型定義（フロントエンド用）
export interface UpdatePagePayload {
  id: string;
  title: string;
  tori: string[];
  uke: string[];
  waza: string[];
  content: string;
  user_id: string;
  is_public?: boolean;
}

// ページ更新API関数
export const updatePage = async (pageData: UpdatePagePayload) => {
  try {
    const response = await trpcClient.pages.update.mutate(pageData);
    invalidateQueryCacheByPrefixes([
      "pages:getList",
      "pages:getById",
      "trainingDates:getMonth",
      "socialProfile:get",
    ]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "ページ更新に失敗しました"));
  }
};

export interface TrainingDateRecord {
  id: string;
  user_id: string;
  training_date: string;
  is_attended: boolean;
  created_at: string;
}

export interface TrainingDatePageCount {
  training_date: string;
  page_count: number;
}

export interface TrainingDateMonthData {
  training_dates: TrainingDateRecord[];
  page_counts: TrainingDatePageCount[];
}

export interface GetTrainingDatesMonthParams {
  userId: string;
  year: number;
  month: number;
}

export const getTrainingDatesMonth = async ({
  userId,
  year,
  month,
}: GetTrainingDatesMonthParams) => {
  try {
    const input = {
      userId,
      year,
      month,
    };

    return await cachedQuery(
      "trainingDates:getMonth",
      input,
      CACHE_TTL_MS.trainingDatesMonth,
      async () => trpcClient.trainingDates.getMonth.query(input),
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "稽古参加日の月次データ取得に失敗しました"),
    );
  }
};

export interface UpsertTrainingDateAttendancePayload {
  userId: string;
  trainingDate: string;
}

export const upsertTrainingDateAttendance = async ({
  userId,
  trainingDate,
}: UpsertTrainingDateAttendancePayload) => {
  try {
    const response = await trpcClient.trainingDates.upsertAttendance.mutate({
      userId,
      trainingDate,
    });
    invalidateQueryCacheByPrefixes(["trainingDates:getMonth"]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "稽古参加日の登録に失敗しました"));
  }
};

export interface RemoveTrainingDateAttendancePayload {
  userId: string;
  trainingDate: string;
}

export const removeTrainingDateAttendance = async ({
  userId,
  trainingDate,
}: RemoveTrainingDateAttendancePayload) => {
  try {
    const response = await trpcClient.trainingDates.removeAttendance.mutate({
      userId,
      trainingDate,
    });
    invalidateQueryCacheByPrefixes(["trainingDates:getMonth"]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "稽古参加日の削除に失敗しました"));
  }
};

// 初期タグ作成API関数
export const initializeUserTags = async (userId: string) => {
  try {
    const response = await trpcClient.tags.initializeForUser.mutate({ userId });
    invalidateQueryCacheByPrefixes([
      "tags:getList",
      "pages:getList",
      "pages:getById",
    ]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "初期タグの作成に失敗しました"));
  }
};

// 統計データ取得の型定義
export interface GetTrainingStatsParams {
  userId: string;
  startDate?: string;
  endDate?: string;
}

// 統計データ取得API関数
export const getTrainingStats = async ({
  userId,
  startDate,
  endDate,
}: GetTrainingStatsParams) => {
  try {
    const input = { userId, startDate, endDate };

    return await cachedQuery(
      "stats:get",
      input,
      CACHE_TTL_MS.trainingStats,
      async () => trpcClient.stats.get.query(input),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "統計データの取得に失敗しました"));
  }
};

export interface UpdateUserInfoPayload {
  userId: string;
  username?: string;
  full_name?: string | null;
  dojo_style_name?: string | null;
  dojo_style_id?: string | null;
  training_start_date?: string | null;
  profile_image_url?: string | null;
  bio?: string | null;
  publicity_setting?: "public" | "closed" | "private";
  aikido_rank?: string | null;
  age_range?: "lt20" | "20s" | "30s" | "40s" | "50s" | "gt60" | null;
  gender?: "male" | "female" | "other" | "not_specified" | null;
}

// 道場検索
export interface SearchDojoStylesParams {
  query: string;
  limit?: number;
}

export const searchDojoStyles = async ({
  query,
  limit,
}: SearchDojoStylesParams) => {
  try {
    return await trpcClient.dojoStyles.search.query({ query, limit });
  } catch (error) {
    throw new Error(getErrorMessage(error, "道場の検索に失敗しました"));
  }
};

// 道場新規登録
export interface CreateDojoStylePayload {
  dojo_name: string;
  dojo_name_kana?: string;
}

export const createDojoStyle = async (payload: CreateDojoStylePayload) => {
  try {
    return await trpcClient.dojoStyles.create.mutate(payload);
  } catch (error) {
    throw new Error(getErrorMessage(error, "道場の登録に失敗しました"));
  }
};

export const checkUsernameAvailability = async (
  username: string,
  excludeUserId?: string,
): Promise<boolean> => {
  try {
    const result = await trpcClient.users.checkUsername.query({
      username,
      excludeUserId,
    });
    return result?.success && result.data?.available === true;
  } catch {
    return true;
  }
};

export const getUserInfo = async (userId: string) => {
  try {
    const input = { userId };
    return await cachedQuery(
      "users:getUserInfo",
      input,
      CACHE_TTL_MS.userInfo,
      async () => trpcClient.users.getUserInfo.query(input),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "ユーザー情報の取得に失敗しました"));
  }
};

export const updateUserInfo = async (payload: UpdateUserInfoPayload) => {
  try {
    const response = await trpcClient.users.updateUserInfo.mutate(payload);

    if (response.success) {
      invalidateQueryCacheByPrefixes([
        "users:getUserInfo",
        "socialProfile:get",
      ]);
    }

    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "ユーザー情報の更新に失敗しました"));
  }
};

export const getPublicityDojos = async (userId: string) => {
  try {
    return await trpcClient.users.getPublicityDojos.query({ userId });
  } catch (error) {
    throw new Error(getErrorMessage(error, "公開対象道場の取得に失敗しました"));
  }
};

export const updatePublicityDojos = async (
  userId: string,
  dojoStyleIds: string[],
) => {
  try {
    return await trpcClient.users.updatePublicityDojos.mutate({
      userId,
      dojoStyleIds,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "公開対象道場の更新に失敗しました"));
  }
};

export interface CreateUserPayload {
  email: string;
  password: string;
  username: string;
  language?: "ja" | "en";
}

export const createUserViaTrpc = async (payload: CreateUserPayload) => {
  try {
    return await trpcClient.users.create.mutate(payload);
  } catch (error) {
    throw new Error(getErrorMessage(error, "ユーザー作成に失敗しました"));
  }
};

// ============================================
// ソーシャル投稿関連API
// ============================================

export interface GetSocialFeedParams {
  userId: string;
  tab?: "all" | "training" | "favorites";
  limit?: number;
  offset?: number;
}

export const getSocialFeed = async ({
  userId,
  tab,
  limit,
  offset,
}: GetSocialFeedParams) => {
  try {
    const input = { userId, tab, limit, offset };
    return await cachedQuery(
      "socialPosts:getFeed",
      input,
      CACHE_TTL_MS.socialFeed,
      async () => trpcClient.socialPosts.getFeed.query(input),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "フィードの取得に失敗しました"));
  }
};

export const getSocialPost = async (postId: string) => {
  try {
    const input = { postId };
    return await cachedQuery(
      "socialPosts:getById",
      input,
      CACHE_TTL_MS.socialPost,
      async () => trpcClient.socialPosts.getById.query(input),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "投稿の取得に失敗しました"));
  }
};

export const getPublicSocialPost = async (postId: string) => {
  try {
    const input = { postId };
    return await cachedQuery(
      "socialPosts:getPublicById",
      input,
      CACHE_TTL_MS.socialPost,
      async () => trpcClient.socialPosts.getPublicById.query(input),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "投稿の取得に失敗しました"));
  }
};

export interface CreateSocialPostPayload {
  user_id: string;
  content: string;
  post_type: "post" | "training_record";
  source_page_id?: string;
  tag_ids?: string[];
}

export const createSocialPost = async (payload: CreateSocialPostPayload) => {
  try {
    const response = await trpcClient.socialPosts.create.mutate(payload);
    invalidateQueryCacheByPrefixes(["socialPosts:getFeed"]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "投稿の作成に失敗しました"));
  }
};

export interface UpdateSocialPostPayload {
  postId: string;
  content?: string;
  tag_ids?: string[];
}

export const updateSocialPost = async (payload: UpdateSocialPostPayload) => {
  try {
    const response = await trpcClient.socialPosts.update.mutate(payload);
    invalidateQueryCacheByPrefixes([
      "socialPosts:getFeed",
      "socialPosts:getById",
    ]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "投稿の更新に失敗しました"));
  }
};

export const deleteSocialPost = async (postId: string) => {
  try {
    const response = await trpcClient.socialPosts.remove.mutate({ postId });
    invalidateQueryCacheByPrefixes([
      "socialPosts:getFeed",
      "socialPosts:getById",
    ]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "投稿の削除に失敗しました"));
  }
};

export interface CreateSocialReplyPayload {
  postId: string;
  user_id: string;
  content: string;
}

export const createSocialReply = async (payload: CreateSocialReplyPayload) => {
  try {
    const response = await trpcClient.socialReplies.create.mutate(payload);
    invalidateQueryCacheByPrefixes(["socialPosts:getById"]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "返信の作成に失敗しました"));
  }
};

export const updateSocialReply = async (payload: {
  postId: string;
  replyId: string;
  content: string;
}) => {
  try {
    const response = await trpcClient.socialReplies.update.mutate(payload);
    invalidateQueryCacheByPrefixes(["socialPosts:getById"]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "返信の更新に失敗しました"));
  }
};

export const deleteSocialReply = async (postId: string, replyId: string) => {
  try {
    const response = await trpcClient.socialReplies.remove.mutate({
      postId,
      replyId,
    });
    invalidateQueryCacheByPrefixes(["socialPosts:getById"]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "返信の削除に失敗しました"));
  }
};

export const toggleFavorite = async (postId: string) => {
  try {
    const response = await trpcClient.socialPosts.toggleFavorite.mutate({
      postId,
    });
    invalidateQueryCacheByPrefixes([
      "socialPosts:getFeed",
      "socialPosts:getById",
    ]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "お気に入りの更新に失敗しました"));
  }
};

export const toggleReplyFavorite = async (replyId: string) => {
  try {
    const response = await trpcClient.socialReplies.toggleFavorite.mutate({
      replyId,
    });
    invalidateQueryCacheByPrefixes(["socialPosts:getById"]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "お気に入りの更新に失敗しました"));
  }
};

export interface ReportPostPayload {
  postId: string;
  user_id: string;
  reason: "spam" | "harassment" | "inappropriate" | "impersonation" | "other";
  detail?: string;
}

export const reportPost = async (payload: ReportPostPayload) => {
  try {
    return await trpcClient.socialPosts.report.mutate(payload);
  } catch (error) {
    throw new Error(getErrorMessage(error, "通報の送信に失敗しました"));
  }
};

export interface ReportReplyPayload {
  replyId: string;
  user_id: string;
  reason: "spam" | "harassment" | "inappropriate" | "impersonation" | "other";
  detail?: string;
}

export const reportReply = async (payload: ReportReplyPayload) => {
  try {
    return await trpcClient.socialReplies.report.mutate(payload);
  } catch (error) {
    throw new Error(getErrorMessage(error, "通報の送信に失敗しました"));
  }
};

export interface SearchSocialPostsParams {
  userId: string;
  query?: string;
  dojoName?: string;
  rank?: string;
  hashtag?: string;
  postType?: "post" | "training_record";
  limit?: number;
  offset?: number;
}

export const searchSocialPosts = async (params: SearchSocialPostsParams) => {
  try {
    return await cachedQuery(
      "socialSearch:search",
      params,
      CACHE_TTL_MS.socialSearch,
      async () => trpcClient.socialSearch.search.query(params),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "投稿の検索に失敗しました"));
  }
};

export const getTrendingHashtags = async (limit?: number) => {
  try {
    const input = limit ? { limit } : undefined;
    return await cachedQuery(
      "socialSearch:trending",
      input ?? {},
      CACHE_TTL_MS.socialSearch,
      async () => trpcClient.socialSearch.trending.query(input),
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "トレンドハッシュタグの取得に失敗しました"),
    );
  }
};

export const getSocialProfile = async (userId: string) => {
  try {
    const input = { userId };
    return await cachedQuery(
      "socialProfile:get",
      input,
      CACHE_TTL_MS.socialProfile,
      async () => trpcClient.socialProfile.get.query(input),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "プロフィールの取得に失敗しました"));
  }
};

export interface GetNotificationsParams {
  limit?: number;
  offset?: number;
}

export const getNotifications = async (params: GetNotificationsParams = {}) => {
  try {
    return await cachedQuery(
      "notifications:getList",
      params,
      CACHE_TTL_MS.notifications,
      async () => trpcClient.notifications.getList.query(params),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "通知の取得に失敗しました"));
  }
};

export interface MarkNotificationsReadPayload {
  notificationIds?: string[];
  markAll?: boolean;
  postId?: string;
}

export const markNotificationsRead = async (
  payload: MarkNotificationsReadPayload,
) => {
  try {
    const response = await trpcClient.notifications.markAsRead.mutate(payload);
    invalidateQueryCacheByPrefixes([
      "notifications:getList",
      "notifications:unreadCount",
      "notifications:unreadPostIds",
    ]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "通知の既読化に失敗しました"));
  }
};

export const getUnreadNotificationPostIds = async (): Promise<string[]> => {
  try {
    const result = await cachedQuery(
      "notifications:unreadPostIds",
      {},
      CACHE_TTL_MS.notifications,
      async () => trpcClient.notifications.getUnreadPostIds.query(),
    );
    if (result?.success && "data" in result) {
      return result.data?.post_ids ?? [];
    }
    return [];
  } catch {
    return [];
  }
};

// サブスクリプション状態取得API関数
export interface SubscriptionStatusResult {
  tier: "free" | "premium";
  status: "active" | "canceled" | "expired" | "billing_issue" | "inactive";
  is_premium: boolean;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export const getSubscriptionStatus =
  async (): Promise<SubscriptionStatusResult> => {
    try {
      const result = await cachedQuery(
        "subscription:status",
        {},
        CACHE_TTL_MS.subscription,
        async () => trpcClient.subscription.getStatus.query(),
      );
      if (result?.success && "data" in result && result.data) {
        return result.data as SubscriptionStatusResult;
      }
      return {
        tier: "free",
        status: "inactive",
        is_premium: false,
        current_period_end: null,
        cancel_at_period_end: false,
      };
    } catch {
      return {
        tier: "free",
        status: "inactive",
        is_premium: false,
        current_period_end: null,
        cancel_at_period_end: false,
      };
    }
  };

// Stripe サブスクリプション同期API関数
export const syncSubscription = async (): Promise<void> => {
  try {
    await trpcClient.subscription.sync.mutate();
  } catch {
    // 同期失敗はサイレントに無視（次回のステータス取得で反映される）
  }
};

// Stripe Customer Portal セッション作成API関数
export const createPortalSession = async (
  locale: string,
): Promise<string | null> => {
  try {
    const result = await trpcClient.subscription.createPortal.mutate({
      locale,
    });
    if (result?.success && "data" in result && result.data?.url) {
      return result.data.url;
    }
    return null;
  } catch (error) {
    throw new Error(getErrorMessage(error, "管理画面の表示に失敗しました"));
  }
};

// Stripe Checkout Session 作成API関数
export const createCheckoutSession = async (
  priceId: string,
  locale: string,
): Promise<string | null> => {
  try {
    const result = await trpcClient.subscription.createCheckout.mutate({
      priceId,
      locale,
    });
    if (result?.success && "data" in result && result.data?.url) {
      return result.data.url;
    }
    return null;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "チェックアウトの作成に失敗しました"),
    );
  }
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  try {
    const result = await cachedQuery(
      "notifications:unreadCount",
      {},
      CACHE_TTL_MS.notifications,
      async () => trpcClient.notifications.getUnreadCount.query(),
    );
    if (result?.success && "data" in result) {
      return result.data?.count ?? 0;
    }
    return 0;
  } catch {
    return 0;
  }
};
