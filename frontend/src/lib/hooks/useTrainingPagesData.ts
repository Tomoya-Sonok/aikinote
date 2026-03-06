import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { type PageCreateData } from "@/components/features/personal/PageCreateModal/PageCreateModal";
import {
  type CreatePagePayload,
  createAttachment,
  createPage,
  deletePage,
  getPages,
  type UpdatePagePayload,
  updatePage,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatToLocalDateString } from "@/lib/utils/dateUtils";
import { type TrainingPageData } from "@/types/training";

// 楽観的更新用の一時的なプレフィックス
const OPTIMISTIC_ID_PREFIX = "optimistic-";

export function useTrainingPagesData() {
  const t = useTranslations();
  const { user, loading: authLoading } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);
  const [allTrainingPageData, setAllTrainingPageData] = useState<
    TrainingPageData[]
  >([]);
  const optimisticIdCounter = useRef(0);

  const fetchAllData = useCallback(async () => {
    if (authLoading) return;

    if (!user?.id) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    try {
      let allPages: TrainingPageData[] = [];
      let offset = 0;
      const limit = 100;
      let hasMoreData = true;

      // 全ページを取得するまでループ
      while (hasMoreData) {
        const response = await getPages({
          userId: user.id,
          limit,
          offset,
          query: "",
          tags: [],
          date: undefined,
        });

        if (!response.success) {
          throw new Error(
            ("error" in response && response.error) ||
              t("personalPages.dataFetchFailed"),
          );
        }

        if (!response.data) {
          throw new Error(t("personalPages.dataFetchFailed"));
        }

        const pagesBatch = response.data.training_pages.map((item) => ({
          id: item.page.id,
          title: item.page.title,
          content: item.page.content,
          comment: item.page.comment,
          date: formatToLocalDateString(item.page.created_at),
          tags: item.tags.map((tag) => tag.name),
        }));

        allPages = [...allPages, ...pagesBatch];

        // 取得したページ数がlimitより少ない場合、これ以上データがない
        hasMoreData = pagesBatch.length === limit;
        offset += limit;
      }

      setAllTrainingPageData(allPages);
    } catch (err) {
      console.error("Failed to fetch training page data:", err);
      setAllTrainingPageData([]);
    } finally {
      setDataLoading(false);
    }
  }, [user, t, authLoading]);

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  const addPage = useCallback(
    async (pageData: PageCreateData) => {
      try {
        if (!user?.id) {
          throw new Error(t("personalPages.loginRequired"));
        }

        const userId = user.id;

        // 楽観的更新: 一時的なIDでプレースホルダーを即座に挿入
        optimisticIdCounter.current += 1;
        const optimisticId = `${OPTIMISTIC_ID_PREFIX}${optimisticIdCounter.current}`;
        const optimisticPage: TrainingPageData = {
          id: optimisticId,
          title: pageData.title.trim(),
          content: pageData.content,
          comment: pageData.comment,
          date: formatToLocalDateString(new Date().toISOString()),
          tags: [...pageData.tori, ...pageData.uke, ...pageData.waza],
        };
        setAllTrainingPageData((prev) => [optimisticPage, ...prev]);

        const payload: CreatePagePayload = {
          title: pageData.title.trim(),
          tori: pageData.tori,
          uke: pageData.uke,
          waza: pageData.waza,
          content: pageData.content,
          comment: pageData.comment,
          user_id: userId,
        };

        const response = await createPage(payload);

        if (response.success && response.data) {
          const pageId = response.data.page.id;

          // 添付メタデータをDBに保存
          if (pageData.attachments && pageData.attachments.length > 0) {
            for (const attachment of pageData.attachments) {
              try {
                const attachmentPayload: Record<string, unknown> = {
                  page_id: pageId,
                  type: attachment.type,
                  original_filename: attachment.original_filename ?? null,
                  file_size_bytes: attachment.file_size_bytes ?? null,
                  thumbnail_url: attachment.thumbnail_url ?? null,
                };

                if (attachment.type === "youtube") {
                  attachmentPayload.url = attachment.url;
                } else {
                  attachmentPayload.file_key = attachment._fileKey;
                }

                await createAttachment(attachmentPayload);
              } catch (attachError) {
                console.warn("添付メタデータの保存に失敗:", attachError);
              }
            }
          }

          // 楽観的プレースホルダーを正式データに差し替え
          const confirmedPage: TrainingPageData = {
            id: pageId,
            title: response.data.page.title,
            content: response.data.page.content,
            comment: response.data.page.comment,
            date: formatToLocalDateString(response.data.page.created_at),
            tags: response.data.tags.map((tag) => tag.name),
          };

          setAllTrainingPageData((prev) =>
            prev.map((page) =>
              page.id === optimisticId ? confirmedPage : page,
            ),
          );
          return true;
        }

        // API失敗時: 楽観的プレースホルダーを除去
        setAllTrainingPageData((prev) =>
          prev.filter((page) => page.id !== optimisticId),
        );
        return false;
      } catch (error) {
        // エラー時: 楽観的更新をロールバック（プレースホルダーを除去）
        setAllTrainingPageData((prev) =>
          prev.filter((page) => !page.id.startsWith(OPTIMISTIC_ID_PREFIX)),
        );
        console.error("Failed to create page:", error);
        alert(
          error instanceof Error
            ? error.message
            : t("personalPages.pageCreationFailed"),
        );
        return false;
      }
    },
    [user, t],
  );

  const updatePageData = useCallback(
    async (pageData: UpdatePagePayload) => {
      // 楽観的更新: 先にUIを更新
      let originalPage: TrainingPageData | undefined;
      let targetIndex = -1;

      setAllTrainingPageData((prev) => {
        targetIndex = prev.findIndex((p) => p.id === pageData.id);
        originalPage = prev[targetIndex];

        if (targetIndex === -1 || !originalPage) return prev;

        const next = [...prev];
        next[targetIndex] = {
          id: pageData.id,
          title: pageData.title,
          content: pageData.content,
          comment: pageData.comment,
          date:
            originalPage.date ||
            formatToLocalDateString(new Date().toISOString()),
          tags: [...pageData.tori, ...pageData.uke, ...pageData.waza],
        };
        return next;
      });

      try {
        const response = await updatePage(pageData);

        if (response.success && response.data) {
          // APIレスポンスで正式データに差し替え
          const confirmedPage: TrainingPageData = {
            id: response.data.page.id,
            title: response.data.page.title,
            content: response.data.page.content,
            comment: response.data.page.comment,
            date: formatToLocalDateString(response.data.page.created_at),
            tags: response.data.tags.map((tag) => tag.name),
          };

          setAllTrainingPageData((prev) =>
            prev.map((page) =>
              page.id === confirmedPage.id ? confirmedPage : page,
            ),
          );
          return true;
        }

        // API失敗時: ロールバック
        if (originalPage && targetIndex !== -1) {
          setAllTrainingPageData((prev) => {
            const next = [...prev];
            const currentIndex = next.findIndex((p) => p.id === pageData.id);
            if (currentIndex !== -1) {
              next[currentIndex] = originalPage as TrainingPageData;
            }
            return next;
          });
        }
        return false;
      } catch (error) {
        // エラー時: ロールバック
        if (originalPage && targetIndex !== -1) {
          setAllTrainingPageData((prev) => {
            const next = [...prev];
            const currentIndex = next.findIndex((p) => p.id === pageData.id);
            if (currentIndex !== -1) {
              next[currentIndex] = originalPage as TrainingPageData;
            }
            return next;
          });
        }
        console.error("Failed to update page:", error);
        alert(
          error instanceof Error
            ? error.message
            : t("personalPages.pageUpdateFailed"),
        );
        return false;
      }
    },
    [t],
  );

  const removePage = useCallback(
    async (pageId: string) => {
      if (!user?.id) {
        alert(t("personalPages.loginRequired"));
        return false;
      }

      // 楽観的更新: 先にUIから削除
      let originalPage: TrainingPageData | undefined;
      let targetIndex = -1;

      setAllTrainingPageData((prev) => {
        targetIndex = prev.findIndex((p) => p.id === pageId);
        originalPage = prev[targetIndex];
        return prev.filter((item) => item.id !== pageId);
      });

      try {
        const response = await deletePage(pageId, user.id);

        if (response.success) {
          return true;
        }

        throw new Error(response.error || t("personalPages.pageDeleteFailed"));
      } catch (error) {
        // エラー時: ロールバック
        if (originalPage && targetIndex !== -1) {
          setAllTrainingPageData((prev) => {
            const next = [...prev];
            if (!next.find((p) => p.id === pageId)) {
              // 削除された要素を元の位置に復元
              const insertPosition = Math.min(targetIndex, next.length);
              next.splice(insertPosition, 0, originalPage as TrainingPageData);
            }
            return next;
          });
        }
        console.error("Failed to delete page:", error);
        alert(
          error instanceof Error
            ? error.message
            : t("personalPages.pageDeleteFailed"),
        );
        return false;
      }
    },
    [user, t],
  );

  return {
    loading: authLoading || dataLoading,
    allTrainingPageData,
    addPage,
    updatePageData,
    removePage,
  };
}
