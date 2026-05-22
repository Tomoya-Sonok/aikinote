"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import type { TagLanguage } from "@/constants/tags";
import { MAX_CATEGORIES } from "@/constants/tags";
import { useToast } from "@/contexts/ToastContext";
import {
  type CreateTagPayload,
  createCategory,
  createTag,
  getCategories,
  getTags,
  initializeUserTags,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { trainingTagsQueryKey } from "@/lib/hooks/useTrainingTags";
import type { UserCategory } from "@/types/category";

/** タグ一覧のキャッシュは useTrainingTags と共有する（queryKey を統一）ので、キーはそちらから再輸出する */
export { trainingTagsQueryKey };

/** カテゴリ一覧の TanStack Query キャッシュキー */
export const trainingCategoriesQueryKey = (userId: string | undefined) =>
  ["training-categories", userId] as const;

interface UseTagManagementOptions {
  /** フックを有効にするか（ページ遷移後に有効化する用途） */
  enabled?: boolean;
}

type TagEntity = {
  id: string;
  name: string;
  category: string;
  user_id: string;
};

export interface UseTagManagementReturn {
  // 動的カテゴリ
  categories: UserCategory[];
  tagsByCategory: Record<string, string[]>;
  selectedByCategory: Record<string, string[]>;
  setSelectedByCategory: (category: string, tags: string[]) => void;
  handleTagToggle: (category: string, tag: string) => void;

  // 旧互換プロパティ（tagsByCategory/selectedByCategoryから導出）
  toriTags: string[];
  ukeTags: string[];
  wazaTags: string[];
  selectedTori: string[];
  selectedUke: string[];
  selectedWaza: string[];
  setSelectedTori: (tags: string[]) => void;
  setSelectedUke: (tags: string[]) => void;
  setSelectedWaza: (tags: string[]) => void;

  // カテゴリ追加
  handleCreateCategory: (name: string) => Promise<void>;

  // 共通
  loading: boolean;
  newTagInput: string;
  setNewTagInput: (value: string) => void;
  showNewTagInput: string | null;
  setShowNewTagInput: (value: string | null) => void;
  handleSubmitNewTag: (category: string) => void;
  handleCancelNewTag: () => void;
  needsInitialTags: boolean;
  initializeTags: (language: TagLanguage) => Promise<void>;
}

export function useTagManagement(
  options: UseTagManagementOptions = {},
): UseTagManagementReturn {
  const { enabled = true } = options;
  const { user } = useAuth();
  const t = useTranslations();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // カテゴリ / タグは TanStack Query に任せる。
  // /personal/pages で `useTrainingTags` が事前にタグをキャッシュしていれば、
  // /personal/pages/new や /social/posts/new に遷移した瞬間にキャッシュヒットする。
  const categoriesQuery = useQuery<UserCategory[], Error>({
    queryKey: trainingCategoriesQueryKey(user?.id),
    enabled: enabled && !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await getCategories(user.id);
      if (response?.success && response.data) {
        return response.data as UserCategory[];
      }
      return [];
    },
  });

  const tagsQuery = useQuery<TagEntity[], Error>({
    queryKey: trainingTagsQueryKey(user?.id),
    enabled: enabled && !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await getTags(user.id);
      if (response.success && response.data) {
        return response.data as TagEntity[];
      }
      return [];
    },
  });

  const categories = categoriesQuery.data ?? [];
  const allTags = tagsQuery.data ?? [];
  const loading = categoriesQuery.isLoading || tagsQuery.isLoading;
  const needsInitialTags = tagsQuery.isSuccess && allTags.length === 0;

  // 動的選択状態: カテゴリ名 → 選択タグ名配列
  const [selectedByCategory, setSelectedByCategoryState] = useState<
    Record<string, string[]>
  >({});

  // 新規タグ入力
  const [newTagInput, setNewTagInput] = useState("");
  const [showNewTagInput, setShowNewTagInput] = useState<string | null>(null);

  const invalidateTagsAndCategories = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trainingTagsQueryKey(user?.id),
      }),
      queryClient.invalidateQueries({
        queryKey: trainingCategoriesQueryKey(user?.id),
      }),
    ]);
  }, [queryClient, user?.id]);

  const initializeTags = useCallback(
    async (language: TagLanguage) => {
      if (!user?.id) return;
      try {
        await initializeUserTags(user.id, language);
        await invalidateTagsAndCategories();
      } catch {
        showToast(t("pageModal.tagAddFailed"), "error");
      }
    },
    [user?.id, showToast, t, invalidateTagsAndCategories],
  );

  // タグをカテゴリ別に分類
  const tagsByCategory = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const tag of allTags) {
      if (!result[tag.category]) {
        result[tag.category] = [];
      }
      result[tag.category].push(tag.name);
    }
    return result;
  }, [allTags]);

  // 旧互換プロパティ
  const toriTags = useMemo(() => tagsByCategory.取り ?? [], [tagsByCategory]);
  const ukeTags = useMemo(() => tagsByCategory.受け ?? [], [tagsByCategory]);
  const wazaTags = useMemo(() => tagsByCategory.技 ?? [], [tagsByCategory]);

  const selectedTori = useMemo(
    () => selectedByCategory.取り ?? [],
    [selectedByCategory],
  );
  const selectedUke = useMemo(
    () => selectedByCategory.受け ?? [],
    [selectedByCategory],
  );
  const selectedWaza = useMemo(
    () => selectedByCategory.技 ?? [],
    [selectedByCategory],
  );

  const setSelectedByCategory = useCallback(
    (category: string, tags: string[]) => {
      setSelectedByCategoryState((prev) => ({
        ...prev,
        [category]: tags,
      }));
    },
    [],
  );

  const setSelectedTori = useCallback(
    (tags: string[]) => setSelectedByCategory("取り", tags),
    [setSelectedByCategory],
  );
  const setSelectedUke = useCallback(
    (tags: string[]) => setSelectedByCategory("受け", tags),
    [setSelectedByCategory],
  );
  const setSelectedWaza = useCallback(
    (tags: string[]) => setSelectedByCategory("技", tags),
    [setSelectedByCategory],
  );

  const handleTagToggle = useCallback((category: string, tag: string) => {
    setSelectedByCategoryState((prev) => {
      const current = prev[category] ?? [];
      const next = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      return { ...prev, [category]: next };
    });
  }, []);

  const handleCreateTag = useCallback(
    async (tagData: CreateTagPayload) => {
      try {
        const response = await createTag(tagData);
        if (response.success && response.data) {
          await queryClient.invalidateQueries({
            queryKey: trainingTagsQueryKey(user?.id),
          });
          setNewTagInput("");
          setShowNewTagInput(null);

          // 新規作成したタグを自動選択
          const categoryName = response.data.category;
          handleTagToggle(categoryName, response.data.name);
        }
      } catch (error) {
        showToast(
          `${t("pageModal.tagAddFailed")}: ${error instanceof Error ? error.message : t("pageModal.unknownError")}`,
          "error",
        );
      }
    },
    [queryClient, user?.id, showToast, t, handleTagToggle],
  );

  const handleSubmitNewTag = useCallback(
    (category: string) => {
      const trimmed = newTagInput.trim();
      if (!trimmed) {
        showToast(t("pageModal.tagNameRequired"), "error");
        return;
      }
      if (trimmed.length > 20) {
        showToast(t("pageModal.tagNameTooLong"), "error");
        return;
      }
      if (!/^[a-zA-Z0-9ぁ-んァ-ンー一-龠０-９\- ]+$/.test(trimmed)) {
        showToast(t("pageModal.tagNameInvalid"), "error");
        return;
      }
      if (!user?.id) return;

      handleCreateTag({
        name: trimmed,
        category,
        user_id: user.id,
      });
    },
    [newTagInput, user?.id, showToast, t, handleCreateTag],
  );

  const handleCancelNewTag = useCallback(() => {
    setNewTagInput("");
    setShowNewTagInput(null);
  }, []);

  const handleCreateCategory = useCallback(
    async (name: string) => {
      if (!user?.id) return;
      if (categories.length >= MAX_CATEGORIES) {
        showToast(
          t("tagManagement.categoryLimitReached", { max: MAX_CATEGORIES }),
          "error",
        );
        return;
      }
      try {
        const response = await createCategory({
          name,
          user_id: user.id,
        });
        if (response.success && response.data) {
          const newCat = response.data as UserCategory;
          // 即時反映のためキャッシュに追記（サーバー側で作成済みなので invalidate は不要）
          queryClient.setQueryData<UserCategory[]>(
            trainingCategoriesQueryKey(user.id),
            (prev) => (prev ? [...prev, newCat] : [newCat]),
          );
          showToast(t("tagManagement.categoryCreateSuccess"), "success");
        } else {
          showToast(
            ("error" in response && response.error) ||
              t("tagManagement.categoryCreateFailed"),
            "error",
          );
        }
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : t("tagManagement.categoryCreateFailed"),
          "error",
        );
      }
    },
    [user?.id, categories.length, queryClient, showToast, t],
  );

  return {
    // 動的カテゴリ
    categories,
    tagsByCategory,
    selectedByCategory,
    setSelectedByCategory,
    handleTagToggle,
    handleCreateCategory,

    // 旧互換
    toriTags,
    ukeTags,
    wazaTags,
    selectedTori,
    selectedUke,
    selectedWaza,
    setSelectedTori,
    setSelectedUke,
    setSelectedWaza,

    // 共通
    loading,
    newTagInput,
    setNewTagInput,
    showNewTagInput,
    setShowNewTagInput,
    handleSubmitNewTag,
    handleCancelNewTag,
    needsInitialTags,
    initializeTags,
  };
}
