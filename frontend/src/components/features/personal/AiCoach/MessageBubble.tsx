import type { FC } from "react";
import { linkifyText } from "@/lib/utils/linkifyText";
import styles from "./MessageBubble.module.css";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  text: string;
}

export const MessageBubble: FC<MessageBubbleProps> = ({ role, text }) => {
  const isUser = role === "user";
  return (
    <div
      className={`${styles.row} ${isUser ? styles.rowUser : styles.rowAssistant}`}
    >
      <div
        className={`${styles.bubble} ${isUser ? styles.user : styles.assistant}`}
      >
        {linkifyText(text)}
      </div>
    </div>
  );
};
