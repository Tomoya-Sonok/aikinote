"use client";

import type { FC } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTypewriter } from "@/lib/aiCoach/useTypewriter";
import { linkifyText } from "@/lib/utils/linkifyText";
import styles from "./MessageBubble.module.css";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  text: string;
  // 新規ストリーミング中の assistant メッセージのみ true。
  // false（過去メッセージなど）の場合はタイプライターを介さず即時表示。
  isStreaming?: boolean;
}

export const MessageBubble: FC<MessageBubbleProps> = ({
  role,
  text,
  isStreaming = false,
}) => {
  const isUser = role === "user";
  // assistant のみタイプライター演出（user では isStreaming=false 扱いで即時）
  const displayedText = useTypewriter(text, !isUser && isStreaming);

  return (
    <div
      className={`${styles.row} ${isUser ? styles.rowUser : styles.rowAssistant}`}
    >
      <div
        className={`${styles.bubble} ${isUser ? styles.user : styles.assistant}`}
      >
        {isUser ? (
          linkifyText(text)
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // 外部リンクは新規タブで開く
              a: ({ node: _node, ...props }) => (
                <a {...props} target="_blank" rel="noreferrer" />
              ),
            }}
          >
            {displayedText}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
};
