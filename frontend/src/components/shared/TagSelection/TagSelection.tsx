import { PlusCircle, XCircle } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import { Tag } from "@/components/shared/Tag/Tag";
import styles from "./TagSelection.module.css";

interface TagSelectionProps {
  title: string;
  tags: string[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  onAddNew?: () => void;
  onCancel?: () => void;
  showAddButton?: boolean;
}

export const TagSelection: FC<TagSelectionProps> = ({
  title,
  tags,
  selectedTags,
  onTagToggle,
  onAddNew,
  onCancel,
  showAddButton = true,
}) => {
  const t = useTranslations();
  return (
    <div className={styles.container}>
      <div className={styles.titleButtonWrapper}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          {showAddButton ? (
            <button
              type="button"
              className={styles.addButton}
              onClick={onAddNew}
            >
              <PlusCircle size={16} weight="light" />
              {t("tagSelection.add")}
            </button>
          ) : (
            onCancel && (
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onCancel}
              >
                <XCircle size={16} weight="light" />
                {t("common.cancel")}
              </button>
            )
          )}
        </div>
        <div className={styles.divider} />

        <div className={styles.tagsGrid}>
          {tags.map((tag) => (
            <Tag
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "selectable"}
              onClick={() => onTagToggle(tag)}
            >
              {tag}
            </Tag>
          ))}
        </div>
      </div>
    </div>
  );
};
