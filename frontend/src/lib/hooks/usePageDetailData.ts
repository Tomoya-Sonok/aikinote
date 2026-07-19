import {
  type InfiniteData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import type { AttachmentData } from "@/components/features/personal/AttachmentCard/AttachmentCard";
import { getAttachments, getPage } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import type { TrainingPageData } from "@/types/training";

export const pageDetailQueryKey = (
  pageId: string,
  userId: string | undefined,
) => ["page-detail", pageId, userId] as const;

export const pageAttachmentsQueryKey = (pageId: string) =>
  ["page-attachments", pageId] as const;

// useTrainingPagesData の無限スクロールキャッシュ（["training-pages", userId, options]）の
// 1ページ分。placeholder 探索に必要な部分だけを構造的に型定義する
type TrainingPagesListPage = {
  training_pages: TrainingPageData[];
};

interface UsePageDetailDataOptions {
  /**
   * 一覧キャッシュに同じページがあれば placeholderData として即表示する
   * （詳細 API の往復を待たずに一覧→詳細の遷移を待機ゼロにする）。
   * placeholder はキャッシュに書き込まれないため他画面には影響しないが、
   * 編集画面（PageEdit）はフォーム初期値をサーバー取得値で確定させる必要が
   * あるため有効化しないこと。
   */
  seedFromListCache?: boolean;
}

export function usePageDetailData(
  pageId: string,
  { seedFromListCache = false }: UsePageDetailDataOptions = {},
) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // 一覧キャッシュ（フィルタ違いを含む全エントリ）から該当ページを探す
  const findPageInListCache = useCallback((): TrainingPageData | undefined => {
    if (!seedFromListCache || !pageId || !user?.id) return undefined;
    const entries = queryClient.getQueriesData<
      InfiniteData<TrainingPagesListPage>
    >({ queryKey: ["training-pages", user.id] });
    for (const [, data] of entries) {
      const found = data?.pages
        ?.flatMap((listPage) => listPage.training_pages)
        .find((listPage) => listPage.id === pageId);
      if (found) return found;
    }
    return undefined;
  }, [seedFromListCache, pageId, user?.id, queryClient]);

  const pageQuery = useQuery({
    queryKey: pageDetailQueryKey(pageId, user?.id),
    placeholderData: () => findPageInListCache(),
    queryFn: async (): Promise<TrainingPageData | null> => {
      if (!pageId || !user?.id) return null;
      const response = await getPage(pageId, user.id);
      if (!response.success || !response.data) return null;
      return {
        id: response.data.page.id,
        title: response.data.page.title,
        content: response.data.page.content,
        content_mode: response.data.page.content_mode ?? "free",
        is_public: response.data.page.is_public ?? false,
        date: response.data.page.created_at,
        tags: response.data.tags.map((tag) => tag.name),
        memos: (response.data.memos ?? []).map((memo) => ({
          id: memo.id,
          content: memo.content,
          sort_order: memo.sort_order,
          tags: memo.tags,
        })),
        attachments: response.data.attachments ?? [],
      };
    },
    enabled: !authLoading && !!pageId && !!user?.id,
  });

  const attachmentsQuery = useQuery({
    queryKey: pageAttachmentsQueryKey(pageId),
    // 一覧レスポンスは添付も含むため、同じページの添付を placeholder に使う
    // （type はリテラル union へ狭める。値は同一 API 由来で "image"|"video"|"youtube" のみ）
    placeholderData: () =>
      findPageInListCache()?.attachments as AttachmentData[] | undefined,
    queryFn: async (): Promise<AttachmentData[]> => {
      if (!pageId) return [];
      const attachJson = await getAttachments(pageId);
      return attachJson.success && attachJson.data ? attachJson.data : [];
    },
    enabled: !authLoading && !!pageId,
  });

  // 楽観的更新のための setter。呼び出し側は TrainingPageData | null を直接渡すか updater 関数を渡せる
  const setPageData = useCallback(
    (
      updater:
        | TrainingPageData
        | null
        | ((
            prev: TrainingPageData | null | undefined,
          ) => TrainingPageData | null),
    ) => {
      queryClient.setQueryData<TrainingPageData | null>(
        pageDetailQueryKey(pageId, user?.id),
        typeof updater === "function" ? updater : () => updater,
      );
    },
    [queryClient, pageId, user?.id],
  );

  // 添付ファイル再取得（アップロード後などに使う）
  const fetchAttachments = useCallback(async () => {
    await attachmentsQuery.refetch();
  }, [attachmentsQuery]);

  return {
    loading: pageQuery.isLoading || attachmentsQuery.isLoading,
    pageData: pageQuery.data ?? null,
    setPageData,
    attachments: attachmentsQuery.data ?? [],
    fetchAttachments,
    // 初回ロードで失敗してキャッシュも無い（＝オフラインで未訪問ページを開いた等）
    isErrorWithoutCache:
      (pageQuery.isError && !pageQuery.data) ||
      (attachmentsQuery.isError && !attachmentsQuery.data),
    refetch: () => {
      void pageQuery.refetch();
      void attachmentsQuery.refetch();
    },
  };
}
