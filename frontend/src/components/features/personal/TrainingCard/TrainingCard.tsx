import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { type FC, type KeyboardEvent, memo } from "react";
import { Tag } from "@/components/shared/Tag/Tag";
import styles from "./TrainingCard.module.css";

interface TrainingCardProps {
  id: string;
  title: string;
  content: string;
  date: string;
  tags: string[];
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

export const TrainingCard: FC<TrainingCardProps> = memo(
  ({ title, content, date, tags, onEdit, onDelete, onClick }) => {
    const t = useTranslations();
    const handleEdit = () => {
      onEdit?.();
    };

    const handleDelete = () => {
      onDelete?.();
    };

    const handleCardClick = (e: React.MouseEvent) => {
      // Only trigger card click if not clicking on action buttons
      if (!(e.target as Element).closest(`.${styles.actions}`)) {
        onClick?.();
      }
    };

    const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.();
      }
    };

    const cardContent = (
      <>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.actions}>
            {onEdit && (
              <button
                type="button"
                className={styles.iconButton}
                onClick={handleEdit}
              >
                <PencilSimpleIcon
                  size={16}
                  weight="light"
                  color="var(--black)"
                />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className={styles.iconButton}
                onClick={handleDelete}
              >
                <TrashIcon size={16} weight="light" color="var(--black)" />
              </button>
            )}
          </div>
        </div>

        <div className={styles.tags}>
          {tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>

        <p className={styles.content}>{content}</p>
        <div className={styles.date}>
          {t("trainingCard.createdDate")} {date}
        </div>
      </>
    );

    if (onClick) {
      return (
        // biome-ignore lint/a11y/useSemanticElements: Cannot use <button> due to nested interactive elements
        <div
          className={`${styles.card} ${styles.clickable}`}
          onClick={handleCardClick}
          onKeyDown={handleCardKeyDown}
          role="button"
          tabIndex={0}
        >
          {cardContent}
        </div>
      );
    }

    return <div className={styles.card}>{cardContent}</div>;
  },
);

TrainingCard.displayName = "TrainingCard";
