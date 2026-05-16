"use client";

// 「ひとりで」(personal pages) 関連 API のアダプタ層。
//
// Web ブラウザ環境では従来どおり remote (tRPC 経由 / Supabase) を呼び、
// ネイティブアプリ (Expo WebView) の中で動いているときは Native SQLite
// ブリッジ (PERSONAL_*) 経由でローカル DB を読み書きする。
//
// 本 PR (PR3) では:
//   - 関数群は実装するが、各フックからの import 切替は PR6 (初回フルプル+
//     画像オフライン+同期エンジン完成後) に集約する。先行して呼ぶと
//     Native 側 PR4/PR5 未着の状態でデータが空に見えるためユーザー体験が
//     劣化する
//   - 既存 client.ts は触らず、その関数を default の remote 実装として
//     利用する
//
// 仕様: aikinote-native-app/docs/webview-bridge-protocol.md

import type {
  CreatePagePayload,
  CreateTagPayload,
  GetPagesParams,
  UpdatePagePayload,
} from "@/lib/api/client";
import * as remote from "@/lib/api/client";
import {
  BridgeCallError,
  callPersonalBridge,
  isNativeApp,
} from "./native-bridge";

// Native SQLite 行型 (aikinote-native-app/lib/db/schema.ts と対応)
interface SQLitePageRow {
  local_id: string;
  server_id: string | null;
  user_id: string;
  title: string;
  content: string;
  is_public: 0 | 1;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface SQLiteTagRow {
  local_id: string;
  server_id: string | null;
  user_id: string;
  name: string;
  category: string;
  sort_order: number;
}

interface SQLiteCategoryRow {
  local_id: string;
  server_id: string | null;
  user_id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_default: 0 | 1;
}

/**
 * Bridge が NOT_IMPLEMENTED や TIMEOUT を返したときに remote (tRPC) に
 * 暫定フォールバックする helper。
 * 同期エンジン (PR4) と画像オフライン (PR5) が揃うまでは、各種ハンドラの
 * 一部が NOT_IMPLEMENTED で返るためフォールバックが必要。
 */
async function bridgeOrRemote<T>(
  bridge: () => Promise<T>,
  remoteFallback: () => Promise<T>,
): Promise<T> {
  if (!isNativeApp()) return remoteFallback();
  try {
    return await bridge();
  } catch (error) {
    if (
      error instanceof BridgeCallError &&
      (error.code === "NOT_IMPLEMENTED" ||
        error.code === "NO_BRIDGE" ||
        error.code === "NOT_IN_NATIVE_APP")
    ) {
      return remoteFallback();
    }
    throw error;
  }
}

// ============================== Pages ==============================

type RemoteResult<F extends (...args: never[]) => unknown> = Awaited<
  ReturnType<F>
>;

export async function getPages(params: GetPagesParams) {
  return bridgeOrRemote(
    async () => {
      const rows = await callPersonalBridge<SQLitePageRow[]>(
        "PERSONAL_PAGES_LIST",
        {
          userId: params.userId,
          limit: params.limit,
          offset: params.offset,
          query: params.query,
          startDate: params.startDate,
          endDate: params.endDate,
          sortOrder: params.sortOrder,
        },
      );
      // remote の戻り値型に合わせるためキャストする。SQLite 側ハンドラは
      // tags/attachments を未同梱なので、PR6 で正規化を完成させる時に
      // ハンドラ拡張 + 厳密化する予定。
      return normalizePagesListResponse(
        rows,
        params,
      ) as unknown as RemoteResult<typeof remote.getPages>;
    },
    () => remote.getPages(params),
  );
}

export async function getPage(pageId: string, userId: string) {
  return bridgeOrRemote(
    async () => {
      const row = await callPersonalBridge<
        SQLitePageRow & { tags: SQLiteTagRow[] }
      >("PERSONAL_PAGES_GET", { pageId, userId });
      return {
        success: true,
        data: {
          page: normalizePageRow(row),
          tags: row.tags.map((tag) => ({ id: tag.local_id, name: tag.name })),
          attachments: [],
        },
      } as unknown as RemoteResult<typeof remote.getPage>;
    },
    () => remote.getPage(pageId, userId),
  );
}

export async function createPage(pageData: CreatePagePayload) {
  return bridgeOrRemote(
    async () => {
      const result = await callPersonalBridge<{
        localId: string;
        serverId: string | null;
      }>("PERSONAL_PAGES_CREATE", {
        userId: pageData.user_id,
        title: pageData.title,
        content: pageData.content,
        isPublic: pageData.is_public,
        createdAt: pageData.created_at,
      });
      return {
        success: true,
        data: { id: result.localId, server_id: result.serverId },
      } as unknown as RemoteResult<typeof remote.createPage>;
    },
    () => remote.createPage(pageData),
  );
}

export async function updatePage(pageData: UpdatePagePayload) {
  return bridgeOrRemote(
    async () => {
      const result = await callPersonalBridge<{ localId: string }>(
        "PERSONAL_PAGES_UPDATE",
        {
          pageId: pageData.id,
          title: pageData.title,
          content: pageData.content,
          isPublic: pageData.is_public,
        },
      );
      return {
        success: true,
        data: { id: result.localId },
      } as unknown as RemoteResult<typeof remote.updatePage>;
    },
    () => remote.updatePage(pageData),
  );
}

export async function deletePage(pageId: string, userId: string) {
  return bridgeOrRemote(
    async () => {
      await callPersonalBridge<Record<string, never>>("PERSONAL_PAGES_DELETE", {
        pageId,
        userId,
      });
      return { success: true } as unknown as RemoteResult<
        typeof remote.deletePage
      >;
    },
    () => remote.deletePage(pageId, userId),
  );
}

export async function togglePageVisibility(
  pageId: string,
  userId: string,
  isPublic: boolean,
) {
  return bridgeOrRemote(
    async () => {
      await callPersonalBridge<{ localId: string; isPublic: boolean }>(
        "PERSONAL_PAGES_TOGGLE_VISIBILITY",
        { pageId, userId, isPublic },
      );
      return { success: true } as unknown as RemoteResult<
        typeof remote.togglePageVisibility
      >;
    },
    () => remote.togglePageVisibility(pageId, userId, isPublic),
  );
}

// ============================== Tags ==============================

export async function getTags(userId: string) {
  return bridgeOrRemote(
    async () => {
      const rows = await callPersonalBridge<SQLiteTagRow[]>(
        "PERSONAL_TAGS_LIST",
        { userId },
      );
      return {
        success: true,
        data: rows.map((row) => ({
          id: row.local_id,
          name: row.name,
          category: row.category,
          user_id: row.user_id,
        })),
      } as unknown as RemoteResult<typeof remote.getTags>;
    },
    () => remote.getTags(userId),
  );
}

export async function createTag(tagData: CreateTagPayload) {
  return bridgeOrRemote(
    async () => {
      const row = await callPersonalBridge<SQLiteTagRow>(
        "PERSONAL_TAGS_CREATE",
        {
          userId: tagData.user_id,
          name: tagData.name,
          category: tagData.category,
        },
      );
      return {
        success: true,
        data: {
          id: row.local_id,
          name: row.name,
          category: row.category,
          user_id: row.user_id,
        },
      } as unknown as RemoteResult<typeof remote.createTag>;
    },
    () => remote.createTag(tagData),
  );
}

// ============================== Categories ==============================

export async function getCategories(userId: string) {
  return bridgeOrRemote(
    async () => {
      const rows = await callPersonalBridge<SQLiteCategoryRow[]>(
        "PERSONAL_CATEGORIES_LIST",
        { userId },
      );
      return {
        success: true,
        data: rows.map((row) => ({
          id: row.local_id,
          name: row.name,
          slug: row.slug,
          sort_order: row.sort_order,
          is_default: row.is_default === 1,
        })),
      } as unknown as RemoteResult<typeof remote.getCategories>;
    },
    () => remote.getCategories(userId),
  );
}

// ============================== Helpers ==============================

function normalizePageRow(row: SQLitePageRow) {
  return {
    id: row.local_id,
    title: row.title,
    content: row.content,
    is_public: row.is_public === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_id: row.user_id,
  };
}

function normalizePagesListResponse(
  rows: SQLitePageRow[],
  params: GetPagesParams,
) {
  return {
    success: true as const,
    data: {
      training_pages: rows.map((row) => ({
        page: normalizePageRow(row),
        tags: [], // PR6 で N+1 解消（ハンドラ側で JOIN）
        attachments: [], // PR5 で実装
      })),
      total_count: rows.length, // 簡易: limit 内の件数。PR6 で正確な総数取得を実装
      offset: params.offset ?? 0,
      limit: params.limit ?? rows.length,
    },
  };
}
