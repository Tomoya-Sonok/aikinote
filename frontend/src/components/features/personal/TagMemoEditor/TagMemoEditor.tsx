"use client";

import { PlusCircle, XCircle } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Tag } from "@/components/shared/Tag/Tag";
import { TextArea } from "@/components/shared/TextArea/TextArea";
import styles from "./TagMemoEditor.module.css";

export type MemoTagRef = { name: string; category: string };

export type MemoDraft = {
  id: string;
  tags: MemoTagRef[];
  content: string;
};

interface TagMemoEditorProps {
  // 上のカテゴリ別タグ選択で選択済みのタグ（メモの候補）
  availableTags: MemoTagRef[];
  memos: MemoDraft[];
  onChange: (memos: MemoDraft[]) => void;
  // メモ本文が空のままフォーカスを外したときに表示するエラーメッセージ
  contentRequiredMessage?: string;
  maxMemos?: number;
  maxTagsPerMemo?: number;
  maxContentLength?: number;
}

const tagRefKey = (tag: MemoTagRef): string => `${tag.category}${tag.name}`;

export const createEmptyMemo = (): MemoDraft => ({
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  tags: [],
  content: "",
});

export function TagMemoEditor({
  availableTags,
  memos,
  onChange,
  contentRequiredMessage,
  maxMemos = 10,
  maxTagsPerMemo = 3,
  maxContentLength = 500,
}: TagMemoEditorProps) {
  const t = useTranslations();
  // 本文が空のままフォーカスを外したメモのID（onBlur エラー表示用）
  const [blurredEmptyIds, setBlurredEmptyIds] = useState<Set<string>>(
    () => new Set(),
  );

  const clearBlurred = (id: string) => {
    setBlurredEmptyIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleContentBlur = (id: string, content: string) => {
    setBlurredEmptyIds((prev) => {
      const next = new Set(prev);
      if (content.trim()) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // タグ未選択時はメモを入力できない（エラーメッセージ + 非活性）
  if (availableTags.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyMessage}>{t("pageCreate.selectTagFirst")}</p>
        <button type="button" className={styles.addButton} disabled>
          <PlusCircle size={18} weight="light" />
          {t("pageCreate.addMemo")}
        </button>
      </div>
    );
  }

  const updateMemo = (id: string, patch: Partial<MemoDraft>) => {
    onChange(memos.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const toggleMemoTag = (memo: MemoDraft, tag: MemoTagRef) => {
    const key = tagRefKey(tag);
    const isSelected = memo.tags.some((tg) => tagRefKey(tg) === key);
    if (isSelected) {
      updateMemo(memo.id, {
        tags: memo.tags.filter((tg) => tagRefKey(tg) !== key),
      });
    } else {
      if (memo.tags.length >= maxTagsPerMemo) return;
      updateMemo(memo.id, { tags: [...memo.tags, tag] });
    }
  };

  const removeMemo = (id: string) => {
    clearBlurred(id);
    onChange(memos.filter((m) => m.id !== id));
  };

  const addMemo = () => {
    if (memos.length >= maxMemos) return;
    onChange([...memos, createEmptyMemo()]);
  };

  return (
    <div className={styles.editor}>
      {memos.map((memo, index) => {
        const selectedKeys = new Set(memo.tags.map(tagRefKey));
        const reachedTagLimit = memo.tags.length >= maxTagsPerMemo;
        return (
          <div key={memo.id} className={styles.memoBlock}>
            <div className={styles.memoHeader}>
              <span className={styles.memoLabel}>
                {t("pageCreate.memoLabel", { index: index + 1 })}
              </span>
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => removeMemo(memo.id)}
                aria-label={t("pageCreate.removeMemo")}
              >
                <XCircle size={20} weight="light" />
              </button>
            </div>

            <div className={styles.tagsGrid}>
              {availableTags.map((tag) => {
                const selected = selectedKeys.has(tagRefKey(tag));
                return (
                  <Tag
                    key={tagRefKey(tag)}
                    variant={selected ? "default" : "selectable"}
                    className={
                      !selected && reachedTagLimit
                        ? styles.tagDisabled
                        : undefined
                    }
                    onClick={() => toggleMemoTag(memo, tag)}
                  >
                    {tag.name}
                  </Tag>
                );
              })}
            </div>

            <TextArea
              value={memo.content}
              placeholder={t("pageCreate.memoContentPlaceholder")}
              onChange={(e) => {
                const v = e.target.value.slice(0, maxContentLength);
                updateMemo(memo.id, { content: v });
                if (v.trim()) clearBlurred(memo.id);
              }}
              onBlur={() => handleContentBlur(memo.id, memo.content)}
              error={
                blurredEmptyIds.has(memo.id)
                  ? contentRequiredMessage
                  : undefined
              }
              maxLength={maxContentLength}
              showCharCount
              rows={3}
            />
          </div>
        );
      })}

      <button
        type="button"
        className={styles.addButton}
        onClick={addMemo}
        disabled={memos.length >= maxMemos}
      >
        <PlusCircle size={18} weight="light" />
        {t("pageCreate.addMemo")}
      </button>
    </div>
  );
}
