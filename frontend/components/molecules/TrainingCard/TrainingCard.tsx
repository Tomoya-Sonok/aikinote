import type { FC } from "react";
import Image from "next/image";
import { Tag } from "../../atoms/Tag/Tag";
import { Button } from "../../atoms/Button/Button";
import styles from "./TrainingCard.module.css";

interface TrainingCardProps {
  id: string;
  title: string;
  content: string;
  date: string;
  tags: string[];
  onEdit?: () => void;
  onDelete?: () => void;
}

export const TrainingCard: FC<TrainingCardProps> = ({
  title,
  content,
  date: _date,
  tags,
  onEdit,
  onDelete,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.actions}>
          {onEdit && (
            <Button variant="icon" onClick={onEdit}>
              <Image
                src="/icons/edit-icon.svg"
                alt="編集"
                width={13}
                height={13}
              />
            </Button>
          )}
          {onDelete && (
            <Button variant="icon" onClick={onDelete}>
              <Image
                src="/icons/trash-icon.svg"
                alt="削除"
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
    </div>
  );
};
