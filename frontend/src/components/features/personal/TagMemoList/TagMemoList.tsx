import type { FC } from "react";
import { Tag } from "@/components/shared/Tag/Tag";
import { linkifyText } from "@/lib/utils/linkifyText";
import type { TrainingPageMemo } from "@/types/training";
import styles from "./TagMemoList.module.css";

interface TagMemoListProps {
  memos: TrainingPageMemo[];
}

// #280 タグごとのメモを「タグchips + 本文」ブロックで縦に並べて表示する（読み取り専用）
export const TagMemoList: FC<TagMemoListProps> = ({ memos }) => {
  return (
    <div className={styles.list}>
      {memos.map((memo) => (
        <div key={memo.id} className={styles.memoBlock}>
          <div className={styles.tags}>
            {memo.tags.map((tag) => (
              <Tag key={tag.id}>{tag.name}</Tag>
            ))}
          </div>
          <div className={styles.content}>{linkifyText(memo.content)}</div>
        </div>
      ))}
    </div>
  );
};
