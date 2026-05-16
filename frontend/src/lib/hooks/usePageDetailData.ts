import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { AttachmentData } from "@/components/features/personal/AttachmentCard/AttachmentCard";
// 「ひとりで」のページ詳細はネイティブ環境では SQLite (adapter 経由) に
// 切り替わる。Web ブラウザでは isNative=false なので従来通り tRPC 経由。
// 添付ファイルは PR5 (画像オフライン) と PR6 でブリッジ対応するが、現状は
// 引き続き既存 client の getAttachments を使う (Native 環境では adapter 内で
// remote へフォールバック)。
import { getAttachments } from "@/lib/api/client";
import { getPage } from "@/lib/api/personal-adapter";
import { useAuth } from "@/lib/hooks/useAuth";
import type { TrainingPageData } from "@/types/training";

export const pageDetailQueryKey = (
  pageId: string,
  userId: string | undefined,
) => ["page-detail", pageId, userId] as const;

export const pageAttachmentsQueryKey = (pageId: string) =>
  ["page-attachments", pageId] as const;

export function usePageDetailData(pageId: string) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const pageQuery = useQuery({
    queryKey: pageDetailQueryKey(pageId, user?.id),
    queryFn: async (): Promise<TrainingPageData | null> => {
      if (!pageId || !user?.id) return null;
      const response = await getPage(pageId, user.id);
      if (!response.success || !response.data) return null;
      return {
        id: response.data.page.id,
        title: response.data.page.title,
        content: response.data.page.content,
        is_public: response.data.page.is_public ?? false,
        date: response.data.page.created_at,
        tags: response.data.tags.map((tag) => tag.name),
        attachments: response.data.attachments ?? [],
      };
    },
    enabled: !authLoading && !!pageId && !!user?.id,
  });

  const attachmentsQuery = useQuery({
    queryKey: pageAttachmentsQueryKey(pageId),
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
