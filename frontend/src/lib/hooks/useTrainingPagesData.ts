import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { type PageCreateData } from "@/components/features/personal/PageCreateModal/PageCreateModal";
import {
  type CreatePagePayload,
  createPage,
  deletePage,
  getPages,
  type UpdatePagePayload,
  updatePage,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatToLocalDateString } from "@/lib/utils/dateUtils";
import { type TrainingPageData } from "@/types/training";

export function useTrainingPagesData() {
  const t = useTranslations();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allTrainingPageData, setAllTrainingPageData] = useState<
    TrainingPageData[]
  >([]);

  const fetchAllData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

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
      setLoading(false);
    }
  }, [user, t]);

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
          const newPage: TrainingPageData = {
            id: response.data.page.id,
            title: response.data.page.title,
            content: response.data.page.content,
            comment: response.data.page.comment,
            date: formatToLocalDateString(response.data.page.created_at),
            tags: response.data.tags.map((tag) => tag.name),
          };

          setAllTrainingPageData((prev) => [newPage, ...prev]);
          return true;
        }
        return false;
      } catch (error) {
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
      try {
        const response = await updatePage(pageData);

        if (response.success && response.data) {
          const updatedPage: TrainingPageData = {
            id: response.data.page.id,
            title: response.data.page.title,
            content: response.data.page.content,
            comment: response.data.page.comment,
            date: formatToLocalDateString(response.data.page.created_at),
            tags: response.data.tags.map((tag) => tag.name),
          };

          setAllTrainingPageData((prev) =>
            prev.map((page) =>
              page.id === updatedPage.id ? updatedPage : page,
            ),
          );
          return true;
        }
        return false;
      } catch (error) {
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

      try {
        const response = await deletePage(pageId, user.id);

        if (response.success) {
          setAllTrainingPageData((prev) =>
            prev.filter((item) => item.id !== pageId),
          );
          return true;
        } else {
          throw new Error(
            response.error || t("personalPages.pageDeleteFailed"),
          );
        }
      } catch (error) {
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
    loading,
    allTrainingPageData,
    addPage,
    updatePageData,
    removePage,
  };
}
