"use client";

import { useChat } from "@ai-sdk/react";
import {
  ArrowLeftIcon,
  PaperPlaneRightIcon,
  PlusCircleIcon,
} from "@phosphor-icons/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { PremiumUpgradeModal } from "@/components/shared/PremiumUpgradeModal/PremiumUpgradeModal";
import { useToast } from "@/contexts/ToastContext";
import type { AiCoachQuickActionId } from "@/lib/aiCoach/constants";
import {
  type AiCoachConversation,
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  fetchAiCoachUsage,
  fetchConversationMessages,
  fetchConversations,
  generateConversationTitle,
} from "@/lib/api/aiCoach";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";
import { useRouter } from "@/lib/i18n/routing";
import styles from "./AiCoachChat.module.css";
import { AiCoachFeedback } from "./AiCoachFeedback";
import { AiCoachHistory } from "./AiCoachHistory";
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

// 1会話分のチャット。useChat を保有し、メッセージリスト＋composer＋quickActions を描画。
function ChatSession({
  conversationId,
  initialMessages,
  initialFeedbackVisible,
  pendingFirstMessage,
  onPendingConsumed,
  onBeforeSend,
  onQuickActionClick,
  onTitleGenerated,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  initialFeedbackVisible: boolean;
  pendingFirstMessage: string | null;
  onPendingConsumed: () => void;
  onBeforeSend: (
    charCount: number,
    quickActionId: AiCoachQuickActionId | null,
  ) => Promise<boolean>;
  onQuickActionClick: (
    id: AiCoachQuickActionId,
    source: "landing" | "in_chat",
  ) => void;
  onTitleGenerated: () => void;
}) {
  const t = useTranslations();
  const [input, setInput] = useState("");
  // フィードバック UI の表示可否。回答すると false になり（DB にも保存）、
  // 同じ会話では二度と表示されない
  const [feedbackVisible, setFeedbackVisible] = useState(
    initialFeedbackVisible,
  );
  const listRef = useRef<HTMLDivElement>(null);
  // 初回応答完了時のタイトル生成を1回だけにするためのガード
  const titleGenStartedRef = useRef(false);
  // React 19 Strict Mode（dev）の useEffect 二重発火による pending メッセージ二重送信を防ぐガード
  const pendingSentRef = useRef(false);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/ai-coach/chat" }),
    [],
  );

  const { messages, sendMessage, status } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    onFinish: () => {
      if (titleGenStartedRef.current) return;
      titleGenStartedRef.current = true;
      // fire-and-forget。完了後に親へ通知して一覧をリフレッシュ。
      void generateConversationTitle(conversationId).then((title) => {
        if (title) onTitleGenerated();
      });
    },
  });

  const isBusy = status === "submitted" || status === "streaming";
  const isStreaming = status === "streaming";

  // AI の応答が1件以上あり、応答中でないときだけフィードバック UI を出す
  const hasAssistantReply = messages.some((m) => m.role === "assistant");
  const shouldShowFeedback = feedbackVisible && hasAssistantReply && !isBusy;

  // 新着メッセージ（ストリーミング更新含む）と応答完了（フィードバック UI の出現）で最下部へスクロール
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages / status 変更時に発火させたい
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, status]);

  // landing から遷移時、pendingFirstMessage を一度だけ送信。
  // ref ガードで StrictMode の二重発火と将来の再レンダリングによる重複送信を防ぐ。
  useEffect(() => {
    if (!pendingFirstMessage || pendingSentRef.current) return;
    pendingSentRef.current = true;
    void sendMessage(
      { text: pendingFirstMessage },
      { body: { conversationId } },
    );
    onPendingConsumed();
  }, [pendingFirstMessage, sendMessage, conversationId, onPendingConsumed]);

  const send = useCallback(
    async (text: string, quickActionId: AiCoachQuickActionId | null) => {
      const trimmed = text.trim();
      if (!trimmed || isBusy) return;
      const allowed = await onBeforeSend(trimmed.length, quickActionId);
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
          <>
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              const isAssistant = m.role === "assistant";
              return (
                <MessageBubble
                  key={m.id}
                  role={m.role}
                  text={messageText(m)}
                  isStreaming={isStreaming && isLast && isAssistant}
                />
              );
            })}
            {shouldShowFeedback && (
              <AiCoachFeedback
                conversationId={conversationId}
                onCompleted={() => setFeedbackVisible(false)}
              />
            )}
          </>
        )}
      </div>

      <div className={styles.composer}>
        {messages.length === 0 && (
          <QuickActionButtons
            disabled={isBusy}
            onSelect={(id, prompt) => {
              onQuickActionClick(id, "in_chat");
              void send(prompt, id);
            }}
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
                void send(input, null);
              }
            }}
          />
          <button
            type="button"
            className={styles.sendButton}
            disabled={isBusy || !input.trim()}
            onClick={() => void send(input, null)}
            aria-label={t("aiCoach.send")}
          >
            <PaperPlaneRightIcon size={22} weight="fill" />
          </button>
        </div>
      </div>
    </>
  );
}

// 会話を開いていない landing 状態。過去チャット一覧（または emptyHint）＋ composer を描画。
function LandingView({
  conversations,
  onSelect,
  onDelete,
  onDeleteAll,
  onSend,
  onQuickActionClick,
  isBusy,
}: {
  conversations: AiCoachConversation[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  onSend: (text: string, quickActionId: AiCoachQuickActionId | null) => void;
  onQuickActionClick: (
    id: AiCoachQuickActionId,
    source: "landing" | "in_chat",
  ) => void;
  isBusy: boolean;
}) {
  const t = useTranslations();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // landing マウント時に入力欄へ自動フォーカスし、スマホではキーボードをそのまま開けるようにする。
  // 過去チャットを開いた場合は ChatSession 側で textarea を描画するため、こちらは発火しない。
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = useCallback(
    (text: string, quickActionId: AiCoachQuickActionId | null) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setInput("");
      onSend(trimmed, quickActionId);
    },
    [onSend],
  );

  return (
    <>
      <div className={styles.messages}>
        <AiCoachHistory
          conversations={conversations}
          onSelect={onSelect}
          onDelete={onDelete}
          onDeleteAll={onDeleteAll}
        />
      </div>

      <div className={styles.composer}>
        <QuickActionButtons
          disabled={isBusy}
          onSelect={(id, prompt) => {
            onQuickActionClick(id, "landing");
            handleSend(prompt, id);
          }}
        />
        <div className={styles.inputRow}>
          <textarea
            ref={textareaRef}
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
                handleSend(input, null);
              }
            }}
          />
          <button
            type="button"
            className={styles.sendButton}
            disabled={isBusy || !input.trim()}
            onClick={() => handleSend(input, null)}
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
  // 開いた会話のフィードバック UI 表示可否（DB の値。新規会話は常に true）
  const [initialFeedbackVisible, setInitialFeedbackVisible] = useState(true);
  const [pendingFirstMessage, setPendingFirstMessage] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isCreatingFromLanding, setIsCreatingFromLanding] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);

  // iOS Safari / WKWebView は viewport の interactive-widget=resizes-content をサポートしておらず、
  // キーボード展開時に layout viewport は full height のまま visual viewport だけ縮む。
  // 結果として position: fixed + inset:0 のレイアウト上端（ヘッダー）が画面外へ押し出されてしまうので、
  // visualViewport API でキーボード除外後の可視領域に追従させ、ヘッダー・過去チャット一覧を画面内に保持する。
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const updateLayout = () => {
      const el = layoutRef.current;
      if (!el) return;
      el.style.top = `${vv.offsetTop}px`;
      el.style.height = `${vv.height}px`;
    };

    updateLayout();
    vv.addEventListener("resize", updateLayout);
    vv.addEventListener("scroll", updateLayout);

    return () => {
      vv.removeEventListener("resize", updateLayout);
      vv.removeEventListener("scroll", updateLayout);
      const el = layoutRef.current;
      if (el) {
        el.style.top = "";
        el.style.height = "";
      }
    };
  }, []);

  // 初期化: 会話一覧の取得のみ（自動オープンしない＝常に landing から開始）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchConversations();
        if (cancelled) return;
        setConversations(list);
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

  const refreshConversations = useCallback(async () => {
    try {
      const list = await fetchConversations();
      setConversations(list);
    } catch {
      // 無視（次回マウントで再取得）
    }
  }, []);

  const selectConversation = useCallback(
    async (id: string) => {
      try {
        const detail = await fetchConversationMessages(id);
        setInitialMessages(toUiMessages(detail.messages));
        setInitialFeedbackVisible(detail.isFeedbackVisible);
        setPendingFirstMessage(null);
        setActiveId(id);
      } catch {
        showToast(t("aiCoach.loadFailed"), "error");
      }
    },
    [showToast, t],
  );

  // ヘッダーの「＋」: landing に戻す（DB 行は最初のメッセージ送信時に遅延作成）
  const handleNewConversation = useCallback(() => {
    setActiveId(null);
    setInitialMessages([]);
    setPendingFirstMessage(null);
  }, []);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await apiDeleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (id === activeId) {
          setActiveId(null);
          setInitialMessages([]);
          setPendingFirstMessage(null);
        }
      } catch {
        showToast(t("aiCoach.deleteFailed"), "error");
      }
    },
    [activeId, showToast, t],
  );

  const handleDeleteAll = useCallback(async () => {
    setShowDeleteAllConfirm(false);
    try {
      await Promise.all(conversations.map((c) => apiDeleteConversation(c.id)));
      setConversations([]);
      setActiveId(null);
      setInitialMessages([]);
      setPendingFirstMessage(null);
    } catch {
      showToast(t("aiCoach.deleteFailed"), "error");
    }
  }, [conversations, showToast, t]);

  // 送信前の利用可否チェック + Umami 計測。
  // quickActionId は固定プロンプト由来のときに識別子（weeklyReview など）が入り、
  // フリー入力では null。message_send イベントへブレイクダウン用に同梱する。
  const handleBeforeSend = useCallback(
    async (
      charCount: number,
      quickActionId: AiCoachQuickActionId | null,
    ): Promise<boolean> => {
      try {
        const usage = await fetchAiCoachUsage();
        if (!usage.allowed) {
          track("ai_coach_limit_reached", { tier: usage.tier });
          setShowPremiumModal(true);
          return false;
        }
        track("ai_coach_message_send", {
          is_quick_action: quickActionId !== null,
          quick_action_id: quickActionId,
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

  // クイックアクションのクリックを利用制限チェック前に計測（クリック意図と送信完遂を分離）
  const handleQuickActionClick = useCallback(
    (id: AiCoachQuickActionId, source: "landing" | "in_chat") => {
      track("ai_coach_quick_action_click", {
        quick_action_id: id,
        source,
      });
    },
    [track],
  );

  // landing から送信: 利用可否チェック → 会話の遅延作成 → ChatSession マウントへ pending を渡す
  const handleLandingSend = useCallback(
    async (text: string, quickActionId: AiCoachQuickActionId | null) => {
      if (isCreatingFromLanding) return;
      const allowed = await handleBeforeSend(text.length, quickActionId);
      if (!allowed) return;
      setIsCreatingFromLanding(true);
      try {
        const created = await apiCreateConversation("");
        setConversations((prev) => [created, ...prev]);
        setInitialMessages([]);
        setInitialFeedbackVisible(true);
        setActiveId(created.id);
        setPendingFirstMessage(text);
      } catch {
        showToast(t("aiCoach.createFailed"), "error");
      } finally {
        setIsCreatingFromLanding(false);
      }
    },
    [isCreatingFromLanding, handleBeforeSend, showToast, t],
  );

  return (
    <div ref={layoutRef} className={styles.layout}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => router.push("/personal/pages")}
          aria-label={t("aiCoach.back")}
        >
          <ArrowLeftIcon size={24} weight="light" />
        </button>
        <div className={styles.titleWrap}>
          <span className={styles.title}>{t("aiCoach.title")}</span>
          <span className={styles.betaBadge}>{t("aiCoach.beta")}</span>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          onClick={handleNewConversation}
          aria-label={t("aiCoach.newConversation")}
        >
          <PlusCircleIcon size={24} weight="light" />
        </button>
      </header>

      {loading ? (
        <div className={styles.messages}>
          <p className={styles.emptyHint}>{t("aiCoach.loading")}</p>
        </div>
      ) : activeId ? (
        <ChatSession
          key={activeId}
          conversationId={activeId}
          initialMessages={initialMessages}
          initialFeedbackVisible={initialFeedbackVisible}
          pendingFirstMessage={pendingFirstMessage}
          onPendingConsumed={() => setPendingFirstMessage(null)}
          onBeforeSend={handleBeforeSend}
          onQuickActionClick={handleQuickActionClick}
          onTitleGenerated={refreshConversations}
        />
      ) : (
        <LandingView
          conversations={conversations}
          onSelect={selectConversation}
          onDelete={handleDeleteConversation}
          onDeleteAll={() => setShowDeleteAllConfirm(true)}
          onSend={handleLandingSend}
          onQuickActionClick={handleQuickActionClick}
          isBusy={isCreatingFromLanding}
        />
      )}

      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        translationKey="premiumModalAiCoach"
      />

      <ConfirmDialog
        isOpen={showDeleteAllConfirm}
        title={t("aiCoach.deleteAll")}
        message={t("aiCoach.deleteAllConfirm")}
        confirmLabel={t("aiCoach.deleteAll")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleDeleteAll}
        onCancel={() => setShowDeleteAllConfirm(false)}
      />
    </div>
  );
}
