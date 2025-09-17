import type { FC } from "react";
import { useMemo } from "react";
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
  onTagToggle: (tagName: string) => void;
  title?: string;
}

export const TagFilterModal: FC<TagFilterModalProps> = ({
  isOpen,
  onClose,
  tags,
  selectedTags,
  onTagToggle,
  title = "タグで絞り込み",
}) => {
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

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      onClose();
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
          onClick={onClose}
          className={styles.closeButton}
          aria-label="閉じる"
        >
          ×
        </button>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
        </div>
        <div className={styles.content}>
          <div className={styles.section}>
            <TagSelection
              title="取り"
              tags={toriTags}
              selectedTags={selectedTags}
              onTagToggle={onTagToggle}
              showAddButton={false}
            />
          </div>
          <div className={styles.section}>
            <TagSelection
              title="受け"
              tags={ukeTags}
              selectedTags={selectedTags}
              onTagToggle={onTagToggle}
              showAddButton={false}
            />
          </div>
          <div className={styles.section}>
            <TagSelection
              title="技"
              tags={wazaTags}
              selectedTags={selectedTags}
              onTagToggle={onTagToggle}
              showAddButton={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};