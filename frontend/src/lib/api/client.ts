import { trpcClient } from "@/lib/trpc/client";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

type QueryCacheEntry = {
  expiresAt: number;
  value: unknown;
};

const queryCache = new Map<string, QueryCacheEntry>();

const CACHE_TTL_MS = {
  pagesList: 5_000,
  pageById: 5_000,
  tagsList: 8_000,
  userProfile: 8_000,
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
  comment: string;
  user_id: string;
}

// ページ作成API関数
export const createPage = async (pageData: CreatePagePayload) => {
  try {
    const response = await trpcClient.pages.create.mutate(pageData);
    invalidateQueryCacheByPrefixes(["pages:getList", "pages:getById"]);
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
  date?: string;
}

// ページ一覧取得API関数
export const getPages = async ({
  userId,
  limit,
  offset,
  query,
  tags,
  date,
}: GetPagesParams) => {
  try {
    const input = {
      userId,
      limit,
      offset,
      query,
      tags,
      date,
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

// ページ削除API関数
export const deletePage = async (pageId: string, userId: string) => {
  try {
    const response = await trpcClient.pages.remove.mutate({ pageId, userId });
    invalidateQueryCacheByPrefixes(["pages:getList", "pages:getById"]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "ページ削除に失敗しました"));
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
  comment: string;
  user_id: string;
}

// ページ更新API関数
export const updatePage = async (pageData: UpdatePagePayload) => {
  try {
    const response = await trpcClient.pages.update.mutate(pageData);
    invalidateQueryCacheByPrefixes(["pages:getList", "pages:getById"]);
    return response;
  } catch (error) {
    throw new Error(getErrorMessage(error, "ページ更新に失敗しました"));
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

export interface UpdateUserProfilePayload {
  userId: string;
  username?: string;
  dojo_style_name?: string | null;
  training_start_date?: string | null;
  profile_image_url?: string | null;
}

export const getUserProfile = async (userId: string) => {
  try {
    const input = { userId };
    return await cachedQuery(
      "users:getProfile",
      input,
      CACHE_TTL_MS.userProfile,
      async () => trpcClient.users.getProfile.query(input),
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "ユーザープロフィールの取得に失敗しました"),
    );
  }
};

export const updateUserProfile = async (payload: UpdateUserProfilePayload) => {
  try {
    const response = await trpcClient.users.updateProfile.mutate(payload);

    if (response.success) {
      // Manual cache update is error-prone. Invalidate instead to force fresh fetch.
      invalidateQueryCacheByPrefixes(["users:getProfile"]);
    }

    return response;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "ユーザープロフィールの更新に失敗しました"),
    );
  }
};

export interface CreateUserProfilePayload {
  email: string;
  password: string;
  username: string;
}

export const createUserProfileViaTrpc = async (
  payload: CreateUserProfilePayload,
) => {
  try {
    return await trpcClient.users.create.mutate(payload);
  } catch (error) {
    throw new Error(getErrorMessage(error, "ユーザー作成に失敗しました"));
  }
};
