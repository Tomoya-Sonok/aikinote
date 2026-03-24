"use client";

import { useTranslations } from "next-intl";
import styles from "../EmailVerificationForm/EmailVerificationForm.module.css";

/**
 * メール認証待機画面（ステップ3）
 * メール送信後、ユーザーがメール内のリンクをクリックするまでの待機画面
 */
export function EmailVerificationWaitingForm() {
  const t = useTranslations();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("auth.signup")}</h1>

      <div className={styles.formCard}>
        <div className={styles.contentsWrapper}>
          <div className={styles.stepText}>
            {t("auth.emailVerificationTitle")}
          </div>

          <div className={styles.emailSentMessage}>
            {t("auth.emailVerificationWaiting")}
            {"\n"}
            {t("auth.emailVerificationTime")}
          </div>
        </div>
      </div>
    </div>
  );
}
