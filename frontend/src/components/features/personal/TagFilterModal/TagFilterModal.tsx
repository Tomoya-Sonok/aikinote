import { useTranslations } from "next-intl";
import type { FC } from "react";
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/shared/Button/Button";
import { TagSelection } from "@/components/shared/TagSelection/TagSelection";
import type { UserCategory } from "@/types/category";
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
  categories?: UserCategory[];
}

export const TagFilterModal: FC<TagFilterModalProps> = ({
  isOpen,
  onClose,
  tags,
  selectedTags,
  onTagsConfirm,
  title,
  categories,
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

  // タグをカテゴリ別に分類（動的カテゴリ対応）
  const tagsByCategory = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const tag of tags) {
      if (!result[tag.category]) {
        result[tag.category] = [];
      }
      result[tag.category].push(tag.name);
    }
    return result;
  }, [tags]);

  // カテゴリ表示順序を決定
  const categoryOrder = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories;
    }
    // フォールバック: タグデータから一意なカテゴリを抽出
    const defaultSlugMap: Record<string, string> = {
      取り: "tori",
      受け: "uke",
      技: "waza",
    };
    const uniqueCategories = Array.from(
      new Set(tags.map((tag) => tag.category)),
    );
    return uniqueCategories.map((name, index) => ({
      id: name,
      user_id: "",
      name,
      slug: defaultSlugMap[name] ?? name,
      sort_order: index,
      is_default: name in defaultSlugMap,
      created_at: "",
    }));
  }, [categories, tags]);

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

  return createPortal(
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
          {categoryOrder.map((cat) => {
            const categoryTags = tagsByCategory[cat.name] ?? [];
            if (categoryTags.length === 0) return null;

            const displayTitle = cat.is_default
              ? t(`tagFilterModal.${cat.slug}`)
              : cat.name;

            return (
              <div key={cat.slug} className={styles.section}>
                <TagSelection
                  title={displayTitle}
                  tags={categoryTags}
                  selectedTags={tempSelectedTags}
                  onTagToggle={handleTempTagToggle}
                  showAddButton={false}
                />
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <Button
            variant="cancel"
            onClick={handleCancel}
            className={styles.button}
          >
            {t("tagFilterModal.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            className={styles.button}
          >
            {t("tagFilterModal.filter")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
