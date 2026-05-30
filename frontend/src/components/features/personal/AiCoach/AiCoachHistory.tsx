"use client";

import { ClockCounterClockwiseIcon, XIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import {
  type ConversationGroupKey,
  groupConversationsByDate,
} from "@/lib/aiCoach/groupConversationsByDate";
import type { AiCoachConversation } from "@/lib/api/aiCoach";
import styles from "./AiCoachHistory.module.css";

interface AiCoachHistoryProps {
  conversations: AiCoachConversation[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
}

const groupLabelKey = (key: ConversationGroupKey): string =>
  `aiCoach.dateGroups.${key}`;

// 過去のチャット一覧。投稿検索の「最近の検索」UI に揃えた行（時計＋タイトル＋✕）。
// landing 状態（メッセージ0件）のときに画面中央に表示する。
export const AiCoachHistory: FC<AiCoachHistoryProps> = ({
  conversations,
  onSelect,
  onDelete,
  onDeleteAll,
}) => {
  const t = useTranslations();

  // タイトル未設定の会話（初回応答前の進行中会話）は一覧から除外する。
  const visible = conversations.filter(
    (c) => c.title && c.title.trim().length > 0,
  );

  const groups = groupConversationsByDate(visible);

  return (
    <div className={styles.historySection}>
      {/* 件数に関わらず、landing 状態では常にウェルカムテキストを上部に表示する */}
      <p className={styles.welcome}>{t("aiCoach.emptyHint")}</p>

      {visible.length === 0 ? null : (
        <>
          <div className={styles.historyHeader}>
            <span className={styles.sectionTitle}>{t("aiCoach.history")}</span>
            <button
              type="button"
              className={styles.clearAllButton}
              onClick={onDeleteAll}
            >
              {t("aiCoach.deleteAll")}
            </button>
          </div>

          {groups.map((group) => (
            <div key={group.key} className={styles.group}>
              <span className={styles.groupLabel}>
                {t(groupLabelKey(group.key))}
              </span>
              <div className={styles.historyList}>
                {group.conversations.map((c) => (
                  // biome-ignore lint/a11y/useSemanticElements: 行に削除ボタンを内包するため <button> は使えず、role=button で代替する
                  <div
                    key={c.id}
                    className={styles.historyItem}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(c.id);
                      }
                    }}
                  >
                    <ClockCounterClockwiseIcon
                      size={18}
                      className={styles.historyIcon}
                      weight="light"
                    />
                    <span className={styles.historyText}>{c.title}</span>
                    <button
                      type="button"
                      className={styles.historyDeleteButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(c.id);
                      }}
                      aria-label={t("aiCoach.deleteConversation")}
                    >
                      <XIcon size={16} weight="light" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
