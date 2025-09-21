import Image from "next/image";
import type { FC } from "react";
import { useTranslations } from "next-intl";
import { Button } from "../../atoms/Button/Button";
import { Tag } from "../../atoms/Tag/Tag";
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

export const TrainingCard: FC<TrainingCardProps> = ({
  title,
  content,
  date,
  tags,
  onEdit,
  onDelete,
  onClick,
}) => {
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

  const cardContent = (
    <>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.actions}>
          {onEdit && (
            <Button variant="icon" onClick={handleEdit}>
              <Image
                src="/icons/edit-icon.svg"
                alt={t("trainingCard.edit")}
                width={13}
                height={13}
              />
            </Button>
          )}
          {onDelete && (
            <Button variant="icon" onClick={handleDelete}>
              <Image
                src="/icons/trash-icon.svg"
                alt={t("trainingCard.delete")}
                width={13}
                height={15}
              />
            </Button>
          )}
        </div>
      </div>

      <div className={styles.tags}>
        {tags.map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>

      <p className={styles.content}>{content}</p>
      <div className={styles.date}>{t("trainingCard.createdDate")} {date}</div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`${styles.card} ${styles.clickable}`}
        onClick={handleCardClick}
      >
        {cardContent}
      </button>
    );
  }

  return <div className={styles.card}>{cardContent}</div>;
};
