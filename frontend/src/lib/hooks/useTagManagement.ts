"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { UserCategory } from "@/types/category";

interface UseTagManagementOptions {
  /** フックを有効にするか（ページ遷移後に有効化する用途） */
  enabled?: boolean;
}

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

  const [allTags, setAllTags] = useState<
    { id: string; name: string; category: string; user_id: string }[]
  >([]);
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [needsInitialTags, setNeedsInitialTags] = useState(false);

  // 動的選択状態: カテゴリ名 → 選択タグ名配列
  const [selectedByCategory, setSelectedByCategoryState] = useState<
    Record<string, string[]>
  >({});

  // 新規タグ入力
  const [newTagInput, setNewTagInput] = useState("");
  const [showNewTagInput, setShowNewTagInput] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id || !enabled) return;
    try {
      setLoading(true);

      // カテゴリとタグを並列取得
      const [categoriesResponse, tagsResponse] = await Promise.all([
        getCategories(user.id),
        getTags(user.id),
      ]);

      if (categoriesResponse?.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data);
      }

      if (tagsResponse.success && tagsResponse.data) {
        setAllTags(tagsResponse.data);
        if (tagsResponse.data.length === 0) {
          setNeedsInitialTags(true);
        } else {
          setNeedsInitialTags(false);
        }
      }
    } catch {
      // タグ取得失敗は致命的ではない
    } finally {
      setLoading(false);
    }
  }, [user?.id, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const initializeTags = useCallback(
    async (language: TagLanguage) => {
      if (!user?.id) return;
      try {
        await initializeUserTags(user.id, language);

        // 再取得
        const [categoriesResponse, tagsResponse] = await Promise.all([
          getCategories(user.id),
          getTags(user.id),
        ]);

        if (categoriesResponse?.success && categoriesResponse.data) {
          setCategories(categoriesResponse.data);
        }
        if (tagsResponse.success && tagsResponse.data) {
          setAllTags(tagsResponse.data);
          setNeedsInitialTags(false);
        }
      } catch {
        showToast(t("pageModal.tagAddFailed"), "error");
      }
    },
    [user?.id, showToast, t],
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
          await fetchData();
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
    [fetchData, showToast, t, handleTagToggle],
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
          setCategories((prev) => [...prev, newCat]);
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
    [user?.id, categories.length, showToast, t],
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
