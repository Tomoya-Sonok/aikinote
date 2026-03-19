"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import {
  type CreateTagPayload,
  createTag,
  getTags,
  initializeUserTags,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";

interface UseTagManagementOptions {
  /** タグが0件の場合に初期タグを自動作成するか */
  shouldCreateInitialTags?: boolean;
  /** フックを有効にするか（ページ遷移後に有効化する用途） */
  enabled?: boolean;
}

export interface UseTagManagementReturn {
  toriTags: string[];
  ukeTags: string[];
  wazaTags: string[];
  loading: boolean;
  selectedTori: string[];
  selectedUke: string[];
  selectedWaza: string[];
  setSelectedTori: (tags: string[]) => void;
  setSelectedUke: (tags: string[]) => void;
  setSelectedWaza: (tags: string[]) => void;
  handleTagToggle: (category: "tori" | "uke" | "waza", tag: string) => void;
  newTagInput: string;
  setNewTagInput: (value: string) => void;
  showNewTagInput: string | null;
  setShowNewTagInput: (value: string | null) => void;
  handleSubmitNewTag: (category: string) => void;
  handleCancelNewTag: () => void;
}

export function useTagManagement(
  options: UseTagManagementOptions = {},
): UseTagManagementReturn {
  const { shouldCreateInitialTags = false, enabled = true } = options;
  const { user } = useAuth();
  const t = useTranslations();
  const { showToast } = useToast();

  const [allTags, setAllTags] = useState<
    { id: string; name: string; category: string; user_id: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const initialTagsCreatedRef = useRef(false);

  // 選択状態
  const [selectedTori, setSelectedTori] = useState<string[]>([]);
  const [selectedUke, setSelectedUke] = useState<string[]>([]);
  const [selectedWaza, setSelectedWaza] = useState<string[]>([]);

  // 新規タグ入力
  const [newTagInput, setNewTagInput] = useState("");
  const [showNewTagInput, setShowNewTagInput] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    if (!user?.id || !enabled) return;
    try {
      setLoading(true);
      const response = await getTags(user.id);
      if (response.success && response.data) {
        setAllTags(response.data);
        if (
          shouldCreateInitialTags &&
          response.data.length === 0 &&
          !initialTagsCreatedRef.current
        ) {
          try {
            initialTagsCreatedRef.current = true;
            await initializeUserTags(user.id);
            const updated = await getTags(user.id);
            if (updated.success && updated.data) {
              setAllTags(updated.data);
              showToast(t("pageModal.initialTagsCreated"), "success");
            }
          } catch {
            initialTagsCreatedRef.current = false;
          }
        }
      }
    } catch {
      // タグ取得失敗は致命的ではない
    } finally {
      setLoading(false);
    }
  }, [user?.id, enabled, shouldCreateInitialTags, showToast, t]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // タグをカテゴリ別に分類（useMemoで同期的に導出）
  const toriTags = useMemo(
    () =>
      allTags.filter((tag) => tag.category === "取り").map((tag) => tag.name),
    [allTags],
  );
  const ukeTags = useMemo(
    () =>
      allTags.filter((tag) => tag.category === "受け").map((tag) => tag.name),
    [allTags],
  );
  const wazaTags = useMemo(
    () => allTags.filter((tag) => tag.category === "技").map((tag) => tag.name),
    [allTags],
  );

  const handleTagToggle = useCallback(
    (category: "tori" | "uke" | "waza", tag: string) => {
      const setters = {
        tori: setSelectedTori,
        uke: setSelectedUke,
        waza: setSelectedWaza,
      };
      setters[category]((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
      );
    },
    [],
  );

  const handleCreateTag = useCallback(
    async (tagData: CreateTagPayload) => {
      try {
        const response = await createTag(tagData);
        if (response.success && response.data) {
          await fetchTags();
          setNewTagInput("");
          setShowNewTagInput(null);
          showToast(t("pageModal.tagAdded"), "success");

          const categoryMap: Record<string, "tori" | "uke" | "waza"> = {
            取り: "tori",
            受け: "uke",
            技: "waza",
          };
          const cat = categoryMap[response.data.category];
          if (cat) handleTagToggle(cat, response.data.name);
        }
      } catch (error) {
        showToast(
          `${t("pageModal.tagAddFailed")}: ${error instanceof Error ? error.message : t("pageModal.unknownError")}`,
          "error",
        );
      }
    },
    [fetchTags, showToast, t, handleTagToggle],
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
      if (!/^[a-zA-Z0-9ぁ-んァ-ンー一-龠０-９]+$/.test(trimmed)) {
        showToast(t("pageModal.tagNameInvalid"), "error");
        return;
      }
      const categoryMap: Record<string, "取り" | "受け" | "技"> = {
        tori: "取り",
        uke: "受け",
        waza: "技",
      };
      if (!categoryMap[category] || !user?.id) return;
      handleCreateTag({
        name: trimmed,
        category: categoryMap[category],
        user_id: user.id,
      });
    },
    [newTagInput, user?.id, showToast, t, handleCreateTag],
  );

  const handleCancelNewTag = useCallback(() => {
    setNewTagInput("");
    setShowNewTagInput(null);
  }, []);

  return {
    toriTags,
    ukeTags,
    wazaTags,
    loading,
    selectedTori,
    selectedUke,
    selectedWaza,
    setSelectedTori,
    setSelectedUke,
    setSelectedWaza,
    handleTagToggle,
    newTagInput,
    setNewTagInput,
    showNewTagInput,
    setShowNewTagInput,
    handleSubmitNewTag,
    handleCancelNewTag,
  };
}
