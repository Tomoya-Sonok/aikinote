"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/shared/Button/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";
import styles from "./AccountDeletionSetting.module.css";

interface AccountDeletionSettingProps {
  locale: string;
}

interface NativeWindow extends Window {
  __AIKINOTE_NATIVE_APP__?: boolean;
  ReactNativeWebView?: { postMessage: (message: string) => void };
}

function notifyNativeAccountDeleted() {
  if (typeof window === "undefined") return;
  const win = window as NativeWindow;
  if (!win.__AIKINOTE_NATIVE_APP__ || !win.ReactNativeWebView) return;
  try {
    win.ReactNativeWebView.postMessage(
      JSON.stringify({ type: "ACCOUNT_DELETED" }),
    );
  } catch (e) {
    console.warn("[AccountDeletion] Native への通知失敗", e);
  }
}

export function AccountDeletionSetting({
  locale,
}: AccountDeletionSettingProps) {
  const t = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const { signOutUser } = useAuth();
  const { isPremium } = useSubscription();
  const [agreed, setAgreed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dataListHeadingId = useId();

  const dataItems = [
    t("accountDeletion.dataItem.profile"),
    t("accountDeletion.dataItem.auth"),
    t("accountDeletion.dataItem.trainingPages"),
    t("accountDeletion.dataItem.socialPosts"),
    t("accountDeletion.dataItem.tagsCategories"),
    t("accountDeletion.dataItem.notifications"),
  ];

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        const errorMessage =
          result?.error ?? t("accountDeletion.errorFallback");
        showToast(errorMessage, "error");
        setConfirmOpen(false);
        return;
      }

      notifyNativeAccountDeleted();
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn("[AccountDeletion] storage クリア失敗 (続行)", e);
      }
      await signOutUser();
      showToast(t("accountDeletion.success"), "success");
      router.replace(`/${locale}/login?deleted=1`);
    } catch (error) {
      console.error("[AccountDeletion] 削除リクエスト失敗", error);
      showToast(t("accountDeletion.errorFallback"), "error");
      setConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MinimalLayout
      headerTitle={t("accountDeletion.title")}
      backHref={`/${locale}/settings`}
    >
      <div className={styles.container}>
        <p className={styles.description}>{t("accountDeletion.description")}</p>

        <section className={styles.card} aria-labelledby={dataListHeadingId}>
          <h2 id={dataListHeadingId} className={styles.sectionTitle}>
            {t("accountDeletion.dataListTitle")}
          </h2>
          <ul className={styles.dataList}>
            {dataItems.map((item) => (
              <li key={item} className={styles.dataItem}>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {isPremium && (
          <p className={styles.subscriptionWarning} role="alert">
            {t("accountDeletion.subscriptionWarning")}
          </p>
        )}

        <p className={styles.irreversibleNotice}>
          {t("accountDeletion.irreversibleNotice")}
        </p>

        <label className={styles.agreeLabel}>
          <input
            type="checkbox"
            className={styles.agreeCheckbox}
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={isDeleting}
          />
          <span>{t("accountDeletion.agreeLabel")}</span>
        </label>

        <Button
          type="button"
          variant="danger"
          disabled={!agreed || isDeleting}
          onClick={() => setConfirmOpen(true)}
          className={styles.deleteButton}
        >
          {t("accountDeletion.deleteButton")}
        </Button>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={t("accountDeletion.confirmTitle")}
        message={t("accountDeletion.confirmMessage")}
        confirmLabel={
          isDeleting
            ? t("accountDeletion.deleting")
            : t("accountDeletion.confirmAction")
        }
        cancelLabel={t("accountDeletion.cancelAction")}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
        isProcessing={isDeleting}
      />
    </MinimalLayout>
  );
}
