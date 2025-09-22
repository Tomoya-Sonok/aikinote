import { useTranslations } from "next-intl";
import type { FC } from "react";
import React, { useMemo, useState } from "react";
import { TagSelection } from "@/components/molecules/TagSelection/TagSelection";
import styles from "./TagFilterModal.module.css";

interface TagType {
  id: string;
  name: string;
  category: string;
}

interface TagFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: TagType[];
  selectedTags: string[]; // 選択されているタグ名の配列
  onTagsConfirm: (tags: string[]) => void;
  title?: string;
}

export const TagFilterModal: FC<TagFilterModalProps> = ({
  isOpen,
  onClose,
  tags,
  selectedTags,
  onTagsConfirm,
  title,
}) => {
  const t = useTranslations();
  const [tempSelectedTags, setTempSelectedTags] =
    useState<string[]>(selectedTags);

  // モーダルが開いたときに現在の選択タグを一時選択に設定
  React.useEffect(() => {
    if (isOpen) {
      setTempSelectedTags(selectedTags);
    }
  }, [isOpen, selectedTags]);
  // タグをカテゴリ別に分類
  const { toriTags, ukeTags, wazaTags } = useMemo(() => {
    const toriTags = tags
      .filter((tag) => tag.category === "取り")
      .map((tag) => tag.name);
    const ukeTags = tags
      .filter((tag) => tag.category === "受け")
      .map((tag) => tag.name);
    const wazaTags = tags
      .filter((tag) => tag.category === "技")
      .map((tag) => tag.name);
    return { toriTags, ukeTags, wazaTags };
  }, [tags]);

  if (!isOpen) {
    return null;
  }

  const handleTempTagToggle = (tagName: string) => {
    setTempSelectedTags((prev) => {
      if (prev.includes(tagName)) {
        return prev.filter((tag) => tag !== tagName);
      } else {
        return [...prev, tagName];
      }
    });
  };

  const handleConfirm = () => {
    onTagsConfirm(tempSelectedTags);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedTags(selectedTags);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div className={styles.modal}>
        <button
          type="button"
          onClick={handleCancel}
          className={styles.closeButton}
          aria-label={t("tagFilterModal.close")}
        >
          ×
        </button>
        <div className={styles.header}>
          <h3 className={styles.title}>{title || t("tagFilterModal.title")}</h3>
        </div>
        <div className={styles.content}>
          <div className={styles.section}>
            <TagSelection
              title={t("tagFilterModal.tori")}
              tags={toriTags}
              selectedTags={tempSelectedTags}
              onTagToggle={handleTempTagToggle}
              showAddButton={false}
            />
          </div>
          <div className={styles.section}>
            <TagSelection
              title={t("tagFilterModal.uke")}
              tags={ukeTags}
              selectedTags={tempSelectedTags}
              onTagToggle={handleTempTagToggle}
              showAddButton={false}
            />
          </div>
          <div className={styles.section}>
            <TagSelection
              title={t("tagFilterModal.waza")}
              tags={wazaTags}
              selectedTags={tempSelectedTags}
              onTagToggle={handleTempTagToggle}
              showAddButton={false}
            />
          </div>

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleCancel}
            >
              キャンセル
            </button>
            <button
              type="button"
              className={styles.confirmButton}
              onClick={handleConfirm}
            >
              上記のタグで絞り込む
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
