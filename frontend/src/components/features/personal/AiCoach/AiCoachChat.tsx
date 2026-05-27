"use client";

import { useChat } from "@ai-sdk/react";
import {
  ArrowLeftIcon,
  PaperPlaneRightIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PremiumUpgradeModal } from "@/components/shared/PremiumUpgradeModal/PremiumUpgradeModal";
import { useToast } from "@/contexts/ToastContext";
import {
  type AiCoachConversation,
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  fetchAiCoachUsage,
  fetchConversationMessages,
  fetchConversations,
} from "@/lib/api/aiCoach";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";
import { useRouter } from "@/lib/i18n/routing";
import styles from "./AiCoachChat.module.css";
import { MessageBubble } from "./MessageBubble";
import { QuickActionButtons } from "./QuickActionButtons";

const messageText = (message: UIMessage): string =>
  message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text)
    .join("");

const toUiMessages = (
  stored: { id: string; role: "user" | "assistant"; content: string }[],
): UIMessage[] =>
  stored.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text", text: m.content }],
  }));

// 1会話分のチャット。会話切替時は key で remount して useChat を初期化する。
function ChatSession({
  conversationId,
  initialMessages,
  onBeforeSend,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  onBeforeSend: (charCount: number, isQuickAction: boolean) => Promise<boolean>;
}) {
  const t = useTranslations();
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/ai-coach/chat" }),
    [],
  );

  const { messages, sendMessage, status } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";

  // 新着メッセージ（ストリーミング更新含む）で最下部へスクロール。
  // messages はスクロールのトリガーとして意図的に依存に含める。
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages 変更時に発火させたい
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const send = useCallback(
    async (text: string, isQuickAction: boolean) => {
      const trimmed = text.trim();
      if (!trimmed || isBusy) return;
      const allowed = await onBeforeSend(trimmed.length, isQuickAction);
      if (!allowed) return;
      setInput("");
      void sendMessage({ text: trimmed }, { body: { conversationId } });
    },
    [isBusy, onBeforeSend, sendMessage, conversationId],
  );

  return (
    <>
      <div ref={listRef} className={styles.messages}>
        {messages.length === 0 ? (
          <p className={styles.emptyHint}>{t("aiCoach.emptyHint")}</p>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} text={messageText(m)} />
          ))
        )}
      </div>

      <div className={styles.composer}>
        {messages.length === 0 && (
          <QuickActionButtons
            disabled={isBusy}
            onSelect={(prompt) => send(prompt, true)}
          />
        )}
        <div className={styles.inputRow}>
          <textarea
            className={styles.input}
            value={input}
            placeholder={t("aiCoach.inputPlaceholder")}
            rows={1}
            disabled={isBusy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void send(input, false);
              }
            }}
          />
          <button
            type="button"
            className={styles.sendButton}
            disabled={isBusy || !input.trim()}
            onClick={() => void send(input, false)}
            aria-label={t("aiCoach.send")}
          >
            <PaperPlaneRightIcon size={22} weight="fill" />
          </button>
        </div>
      </div>
    </>
  );
}

export function AiCoachChat() {
  const t = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const { track } = useUmamiTrack();

  const [conversations, setConversations] = useState<AiCoachConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // 初期化: 会話一覧を取得。無ければ1件作成して開く。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchConversations();
        if (cancelled) return;
        if (list.length === 0) {
          const created = await apiCreateConversation("");
          if (cancelled) return;
          setConversations([created]);
          setActiveId(created.id);
          setInitialMessages([]);
        } else {
          setConversations(list);
          const first = list[0];
          setActiveId(first.id);
          const msgs = await fetchConversationMessages(first.id);
          if (cancelled) return;
          setInitialMessages(toUiMessages(msgs));
        }
      } catch {
        if (!cancelled) showToast(t("aiCoach.loadFailed"), "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast, t]);

  const selectConversation = useCallback(
    async (id: string) => {
      setListOpen(false);
      if (id === activeId) return;
      setActiveId(id);
      setInitialMessages([]);
      try {
        const msgs = await fetchConversationMessages(id);
        setInitialMessages(toUiMessages(msgs));
      } catch {
        showToast(t("aiCoach.loadFailed"), "error");
      }
    },
    [activeId, showToast, t],
  );

  const handleNewConversation = useCallback(async () => {
    try {
      const created = await apiCreateConversation("");
      setConversations((prev) => [created, ...prev]);
      setActiveId(created.id);
      setInitialMessages([]);
      setListOpen(false);
    } catch {
      showToast(t("aiCoach.createFailed"), "error");
    }
  }, [showToast, t]);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await apiDeleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (id === activeId) {
          setActiveId(null);
          setInitialMessages([]);
        }
      } catch {
        showToast(t("aiCoach.deleteFailed"), "error");
      }
    },
    [activeId, showToast, t],
  );

  // 送信前の利用可否チェック + Umami 計測
  const handleBeforeSend = useCallback(
    async (charCount: number, isQuickAction: boolean): Promise<boolean> => {
      try {
        const usage = await fetchAiCoachUsage();
        if (!usage.allowed) {
          track("ai_coach_limit_reached", { tier: usage.tier });
          setShowPremiumModal(true);
          return false;
        }
        track("ai_coach_message_send", {
          is_quick_action: isQuickAction,
          char_count: charCount,
        });
        return true;
      } catch {
        showToast(t("aiCoach.sendFailed"), "error");
        return false;
      }
    },
    [track, showToast, t],
  );

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => router.push("/personal/pages")}
          aria-label={t("aiCoach.back")}
        >
          <ArrowLeftIcon size={24} weight="light" />
        </button>
        <button
          type="button"
          className={styles.titleButton}
          onClick={() => setListOpen((v) => !v)}
        >
          {t("aiCoach.title")}
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={handleNewConversation}
          aria-label={t("aiCoach.newConversation")}
        >
          <PlusCircleIcon size={24} weight="light" />
        </button>
      </header>

      {listOpen && (
        <div className={styles.conversationList}>
          {conversations.length === 0 ? (
            <p className={styles.listEmpty}>{t("aiCoach.noConversations")}</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`${styles.conversationItem} ${c.id === activeId ? styles.conversationActive : ""}`}
              >
                <button
                  type="button"
                  className={styles.conversationSelect}
                  onClick={() => selectConversation(c.id)}
                >
                  {c.title || t("aiCoach.untitled")}
                </button>
                <button
                  type="button"
                  className={styles.conversationDelete}
                  onClick={() => handleDeleteConversation(c.id)}
                  aria-label={t("aiCoach.deleteConversation")}
                >
                  <TrashIcon
                    size={16}
                    weight="light"
                    color="var(--error-color)"
                  />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {loading || !activeId ? (
        <div className={styles.messages}>
          <p className={styles.emptyHint}>{t("aiCoach.loading")}</p>
        </div>
      ) : (
        <ChatSession
          key={activeId}
          conversationId={activeId}
          initialMessages={initialMessages}
          onBeforeSend={handleBeforeSend}
        />
      )}

      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        translationKey="premiumModalAiCoach"
      />
    </div>
  );
}
