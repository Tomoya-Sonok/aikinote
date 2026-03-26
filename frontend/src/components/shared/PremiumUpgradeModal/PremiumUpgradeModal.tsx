"use client";

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import styles from "./PremiumUpgradeModal.module.css";

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

declare global {
  interface Window {
    __AIKINOTE_NATIVE_APP__?: boolean;
    showNativePaywall?: () => Promise<{ success: boolean; isPremium: boolean }>;
  }
}

export function PremiumUpgradeModal({
  isOpen,
  onClose,
  title = "Premium プランで解放",
  description = "この機能は Premium プランでご利用いただけます。月額380円で統計データや「みんなで」機能のすべてをお楽しみいただけます。",
}: PremiumUpgradeModalProps) {
  const titleId = useId();
  const upgradeButtonRef = useRef<HTMLButtonElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      upgradeButtonRef.current?.focus();
    }
  }, [isOpen]);

  const handleUpgrade = useCallback(async () => {
    // Native アプリ内: ネイティブ Paywall を表示
    if (window.__AIKINOTE_NATIVE_APP__ && window.showNativePaywall) {
      setIsProcessing(true);
      try {
        const result = await window.showNativePaywall();
        if (result.success) {
          onClose();
          window.location.reload();
        }
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Web ブラウザ: サブスクリプション設定ページへ
    window.location.href = "/ja/settings/subscription";
  }, [onClose]);

  if (!isOpen) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !isProcessing) {
      onClose();
    }
  };

  return createPortal(
    <div
      className={styles.overlay}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={styles.modal}
        role="document"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className={styles.icon} aria-hidden="true">
          &#x2B50;
        </div>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.description}>{description}</p>
        <button
          ref={upgradeButtonRef}
          type="button"
          className={styles.upgradeButton}
          onClick={handleUpgrade}
          disabled={isProcessing}
        >
          {isProcessing ? "処理中..." : "Premium にアップグレード"}
        </button>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          disabled={isProcessing}
        >
          あとで
        </button>
      </div>
    </div>,
    document.body,
  );
}
