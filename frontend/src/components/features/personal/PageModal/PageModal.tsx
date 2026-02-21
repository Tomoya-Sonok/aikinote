"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/shared/Button/Button";
import { TextArea } from "@/components/shared/TextArea/TextArea";
import { TextInput } from "@/components/shared/TextInput/TextInput";
import { TagSelection } from "@/components/shared/TagSelection/TagSelection";
import { useToast } from "@/contexts/ToastContext";
import {
  type CreateTagPayload,
  createTag,
  getTags,
  initializeUserTags,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./PageModal.module.css";

export interface PageFormData {
  id?: string;
  title: string;
  tori: string[];
  uke: string[];
  waza: string[];
  content: string;
  comment: string;
}

interface PageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pageData: PageFormData) => void;
  initialData?: PageFormData;
  modalTitle: string;
  actionButtonText: string;
  shouldCreateInitialTags?: boolean;
}

const defaultFormData: PageFormData = {
  title: "",
  tori: [],
  uke: [],
  waza: [],
  content: "",
  comment: "",
};

export const PageModal: FC<PageModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = defaultFormData,
  modalTitle,
  actionButtonText,
  shouldCreateInitialTags = false,
}) => {
  const t = useTranslations();
  const { showToast } = useToast();
  const { user } = useAuth();
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<PageFormData>(initialData);

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

  // initialDataが変更された時にフォームデータを更新
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  // タグ一覧を取得する関数
  const fetchTags = useCallback(async () => {
    if (!user?.id || !isOpen) return;

    try {
      setLoading(true);
      const response = await getTags(user.id);
      if (response.success && response.data) {
        setAllTags(response.data);

        // 初期タグ作成が必要で、タグが0件かつ初期タグがまだ作成されていない場合のみ初期タグを作成
        if (
          shouldCreateInitialTags &&
          response.data.length === 0 &&
          !initialTagsCreated
        ) {
          try {
            setInitialTagsCreated(true); // 重複実行を防ぐ
            await initializeUserTags(user.id);
            // 初期タグ作成後に再取得
            const updatedResponse = await getTags(user.id);
            if (updatedResponse.success && updatedResponse.data) {
              setAllTags(updatedResponse.data);
              showToast(t("pageModal.initialTagsCreated"), "success");
            }
          } catch (initError) {
            console.error("Failed to initialize tags:", initError);
            showToast(t("pageModal.initialTagsCreateFailed"), "error");
            setInitialTagsCreated(false); // エラー時はリセット
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
      showToast(t("pageModal.tagsFetchFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [
    user?.id,
    isOpen,
    showToast,
    initialTagsCreated,
    shouldCreateInitialTags,
    t,
  ]);

  // タグ作成の関数
  const handleCreateTag = async (tagData: CreateTagPayload) => {
    try {
      const response = await createTag(tagData);
      if (response.success && response.data) {
        await fetchTags(); // タグ一覧を再取得
        setNewTagInput("");
        setShowNewTagInput(null);
        showToast(t("pageModal.tagAdded"), "success");

        const categoryMap: { [key: string]: keyof PageFormData } = {
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
        `${t("pageModal.tagAddFailed")}: ${error instanceof Error ? error.message : t("pageModal.unknownError")}`,
        "error",
      );
    }
  };

  // タグ一覧の初期取得
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // モーダルが開いた時にタイトルフィールドにフォーカス
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      // 少し遅延を設けてモーダルの表示が完了してからフォーカス
      const timeoutId = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

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

  const handleTagToggle = (category: keyof PageFormData, tag: string) => {
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
      showToast(t("pageModal.tagNameRequired"), "error");
      return;
    }

    // クライアントサイドバリデーション
    if (trimmedInput.length > 20) {
      showToast(t("pageModal.tagNameTooLong"), "error");
      return;
    }

    if (!/^[a-zA-Z0-9ぁ-んァ-ンー一-龠０-９]+$/.test(trimmedInput)) {
      showToast(t("pageModal.tagNameInvalid"), "error");
      return;
    }

    const categoryMap: { [key: string]: "取り" | "受け" | "技" } = {
      tori: "取り",
      uke: "受け",
      waza: "技",
    };

    const mappedCategory = categoryMap[category];
    if (!mappedCategory) {
      showToast(t("pageModal.invalidCategory"), "error");
      return;
    }

    if (!user?.id) {
      showToast(t("pageModal.loginRequired"), "error");
      return;
    }

    handleCreateTag({
      name: trimmedInput,
      category: mappedCategory,
      user_id: user.id,
    });
  };

  const handleCancelNewTag = () => {
    setNewTagInput("");
    setShowNewTagInput(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = t("pageModal.titleRequired");
    } else if (formData.title.length > 35) {
      newErrors.title = t("pageModal.titleTooLong");
    }

    if (!formData.content.trim()) {
      newErrors.content = t("pageModal.contentRequired");
    } else if (formData.content.length > 3000) {
      newErrors.content = t("pageModal.contentTooLong");
    }

    if (formData.comment.length > 1000) {
      newErrors.comment = t("pageModal.commentTooLong");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData(initialData);
    setErrors({});
    if (shouldCreateInitialTags) {
      setInitialTagsCreated(false); // モーダル閉時に初期タグ作成状態をリセット
    }
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
          <h2 className={styles.title}>{modalTitle}</h2>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <TextInput
              ref={titleInputRef}
              label={t("pageModal.title")}
              required
              value={formData.title}
              onChange={(e) => {
                const newTitle = e.target.value;
                setFormData((prev) => ({ ...prev, title: newTitle }));
                if (newTitle.length > 35) {
                  setErrors((prev) => ({
                    ...prev,
                    title: t("pageModal.titleTooLong"),
                  }));
                } else {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.title;
                    return newErrors;
                  });
                }
              }}
              error={errors.title}
            />
          </div>

          <div className={styles.section}>
            <TagSelection
              title={t("pageModal.tori")}
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
                  placeholder={t("pageModal.addNewTag")}
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
                  {t("pageModal.add")}
                </button>
                <button type="button" onClick={handleCancelNewTag}>
                  {t("common.cancel")}
                </button>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <TagSelection
              title={t("pageModal.uke")}
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
                  placeholder={t("pageModal.addNewTag")}
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
                  {t("pageModal.add")}
                </button>
                <button type="button" onClick={handleCancelNewTag}>
                  {t("common.cancel")}
                </button>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <TagSelection
              title={t("pageModal.waza")}
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
                  placeholder={t("pageModal.addNewTag")}
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
                  {t("pageModal.add")}
                </button>
                <button type="button" onClick={handleCancelNewTag}>
                  {t("common.cancel")}
                </button>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <TextArea
              label={t("pageModal.content")}
              required
              value={formData.content}
              onChange={(e) => {
                const newContent = e.target.value;
                setFormData((prev) => ({ ...prev, content: newContent }));
                if (newContent.length > 3000) {
                  setErrors((prev) => ({
                    ...prev,
                    content: t("pageModal.contentTooLong"),
                  }));
                } else {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.content;
                    return newErrors;
                  });
                }
              }}
              error={errors.content}
              rows={5}
            />
          </div>

          <div className={styles.section}>
            <TextArea
              label={t("pageModal.comment")}
              value={formData.comment}
              onChange={(e) => {
                const newComment = e.target.value;
                setFormData((prev) => ({ ...prev, comment: newComment }));
                if (newComment.length > 1000) {
                  setErrors((prev) => ({
                    ...prev,
                    comment: t("pageModal.commentTooLong"),
                  }));
                } else {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.comment;
                    return newErrors;
                  });
                }
              }}
              rows={3}
              error={errors.comment}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {actionButtonText}
          </Button>
        </div>
      </dialog>
    </div>
  );
};
