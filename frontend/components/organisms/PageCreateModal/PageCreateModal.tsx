"use client";

import { useSession } from "next-auth/react";
import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import { TextArea } from "@/components/atoms/TextArea/TextArea";
import { TextInput } from "@/components/atoms/TextInput/TextInput";
import { TagSelection } from "@/components/molecules/TagSelection/TagSelection";
import { useToast } from "@/contexts/ToastContext";
import {
  type CreateTagPayload,
  createTag,
  getTags,
  initializeUserTags,
} from "@/lib/api/client";
import styles from "./PageCreateModal.module.css";

interface PageCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pageData: PageCreateData) => void;
}

export interface PageCreateData {
  title: string;
  tori: string[];
  uke: string[];
  waza: string[];
  content: string;
  comment: string;
}

export const PageCreateModal: FC<PageCreateModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const today = new Date().toISOString().split("T")[0];
  const { showToast } = useToast();
  const { data: session } = useSession();

  const [formData, setFormData] = useState<PageCreateData>({
    title: `${today} `,
    tori: [],
    uke: [],
    waza: [],
    content: "",
    comment: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toriTags, setToriTags] = useState<string[]>([]);
  const [ukeTags, setUkeTags] = useState<string[]>([]);
  const [wazaTags, setWazaTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [showNewTagInput, setShowNewTagInput] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<
    { id: string; name: string; category: string; user_id: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [initialTagsCreated, setInitialTagsCreated] = useState(false);

  // タグ一覧を取得する関数
  const fetchTags = useCallback(async () => {
    if (!session?.user?.id || !isOpen) return;

    try {
      setLoading(true);
      const response = await getTags(session.user.id);
      if (response.success && response.data) {
        setAllTags(response.data);

        // タグが0件かつ初期タグがまだ作成されていない場合のみ初期タグを作成
        if (response.data.length === 0 && !initialTagsCreated) {
          try {
            setInitialTagsCreated(true); // 重複実行を防ぐ
            await initializeUserTags(session.user.id);
            // 初期タグ作成後に再取得
            const updatedResponse = await getTags(session.user.id);
            if (updatedResponse.success && updatedResponse.data) {
              setAllTags(updatedResponse.data);
              showToast("初期タグを作成しました", "success");
            }
          } catch (initError) {
            console.error("Failed to initialize tags:", initError);
            showToast("初期タグの作成に失敗しました", "error");
            setInitialTagsCreated(false); // エラー時はリセット
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
      showToast("タグの取得に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, isOpen, showToast, initialTagsCreated]);

  // タグ作成の関数
  const handleCreateTag = async (tagData: CreateTagPayload) => {
    try {
      const response = await createTag(tagData);
      if (response.success && response.data) {
        await fetchTags(); // タグ一覧を再取得
        setNewTagInput("");
        setShowNewTagInput(null);
        showToast("タグが追加されました", "success");

        const categoryMap: { [key: string]: keyof PageCreateData } = {
          取り: "tori",
          受け: "uke",
          技: "waza",
        };

        const formCategory = categoryMap[response.data.category];
        if (formCategory) {
          handleTagToggle(formCategory, response.data.name);
        }
      }
    } catch (error) {
      console.error("Tag creation error:", error);
      showToast(
        `タグの追加に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
        "error",
      );
    }
  };

  // タグ一覧の初期取得
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // タグをカテゴリ別に分類
  useEffect(() => {
    if (allTags && allTags.length > 0) {
      const tori = allTags
        .filter((tag: { category: string }) => tag.category === "取り")
        .map((tag: { name: string }) => tag.name);
      const uke = allTags
        .filter((tag: { category: string }) => tag.category === "受け")
        .map((tag: { name: string }) => tag.name);
      const waza = allTags
        .filter((tag: { category: string }) => tag.category === "技")
        .map((tag: { name: string }) => tag.name);

      setToriTags(tori);
      setUkeTags(uke);
      setWazaTags(waza);
    }
  }, [allTags]);

  const handleTagToggle = (category: keyof PageCreateData, tag: string) => {
    setFormData((prev) => {
      const currentTags = prev[category] as string[];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter((t) => t !== tag)
        : [...currentTags, tag];

      return {
        ...prev,
        [category]: newTags,
      };
    });
  };

  const handleAddNewTag = (category: string) => {
    setShowNewTagInput(category);
  };

  const handleSubmitNewTag = (category: string) => {
    const trimmedInput = newTagInput.trim();

    if (!trimmedInput) {
      showToast("タグ名を入力してください", "error");
      return;
    }

    // クライアントサイドバリデーション
    if (trimmedInput.length > 20) {
      showToast("タグ名は20文字以内で入力してください", "error");
      return;
    }

    if (!/^[a-zA-Z0-9ぁ-んァ-ンー一-龠０-９]+$/.test(trimmedInput)) {
      showToast("タグ名は全角・半角英数字のみ使用可能です", "error");
      return;
    }

    const categoryMap: { [key: string]: "取り" | "受け" | "技" } = {
      tori: "取り",
      uke: "受け",
      waza: "技",
    };

    const mappedCategory = categoryMap[category];
    if (!mappedCategory) {
      showToast("無効なカテゴリです", "error");
      return;
    }

    if (!session?.user?.id) {
      showToast("ログインが必要です", "error");
      return;
    }

    console.log("Submitting tag:", {
      name: trimmedInput,
      category: mappedCategory,
    });

    handleCreateTag({
      name: trimmedInput,
      category: mappedCategory,
      user_id: session.user.id,
    });
  };

  const handleCancelNewTag = () => {
    setNewTagInput("");
    setShowNewTagInput(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "タイトルは必須です";
    }

    if (!formData.content.trim()) {
      newErrors.content = "稽古内容は必須です";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      title: `${today} `,
      tori: [],
      uke: [],
      waza: [],
      content: "",
      comment: "",
    });
    setErrors({});
    setInitialTagsCreated(false); // モーダル閉時に初期タグ作成状態をリセット
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={handleClose}
      onKeyDown={(e) => e.key === "Escape" && handleClose()}
      role="dialog"
      aria-modal="true"
    >
      <dialog
        open
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>ページ作成</h2>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <TextInput
              label="タイトル"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              error={errors.title}
            />
          </div>

          <div className={styles.section}>
            <TagSelection
              title="取り"
              tags={toriTags}
              selectedTags={formData.tori}
              onTagToggle={(tag) => handleTagToggle("tori", tag)}
              onAddNew={() => handleAddNewTag("tori")}
              showAddButton={showNewTagInput !== "tori"}
            />
            {showNewTagInput === "tori" && (
              <div className={styles.newTagInput}>
                <input
                  type="text"
                  placeholder="新しいタグ名を入力"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      handleCancelNewTag();
                    }
                  }}
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => handleSubmitNewTag("tori")}
                  disabled={loading}
                >
                  追加
                </button>
                <button type="button" onClick={handleCancelNewTag}>
                  キャンセル
                </button>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <TagSelection
              title="受け"
              tags={ukeTags}
              selectedTags={formData.uke}
              onTagToggle={(tag) => handleTagToggle("uke", tag)}
              onAddNew={() => handleAddNewTag("uke")}
              showAddButton={showNewTagInput !== "uke"}
            />
            {showNewTagInput === "uke" && (
              <div className={styles.newTagInput}>
                <input
                  type="text"
                  placeholder="新しいタグ名を入力"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      handleCancelNewTag();
                    }
                  }}
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => handleSubmitNewTag("uke")}
                  disabled={loading}
                >
                  追加
                </button>
                <button type="button" onClick={handleCancelNewTag}>
                  キャンセル
                </button>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <TagSelection
              title="技"
              tags={wazaTags}
              selectedTags={formData.waza}
              onTagToggle={(tag) => handleTagToggle("waza", tag)}
              onAddNew={() => handleAddNewTag("waza")}
              showAddButton={showNewTagInput !== "waza"}
            />
            {showNewTagInput === "waza" && (
              <div className={styles.newTagInput}>
                <input
                  type="text"
                  placeholder="新しいタグ名を入力"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      handleCancelNewTag();
                    }
                  }}
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => handleSubmitNewTag("waza")}
                  disabled={loading}
                >
                  追加
                </button>
                <button type="button" onClick={handleCancelNewTag}>
                  キャンセル
                </button>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <TextArea
              label="稽古内容"
              required
              value={formData.content}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, content: e.target.value }))
              }
              error={errors.content}
              rows={5}
            />
          </div>

          <div className={styles.section}>
            <TextArea
              label="その他・コメント（補足や動画URL等）"
              value={formData.comment}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, comment: e.target.value }))
              }
              rows={3}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClose}
          >
            キャンセル
          </button>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </dialog>
    </div>
  );
};
