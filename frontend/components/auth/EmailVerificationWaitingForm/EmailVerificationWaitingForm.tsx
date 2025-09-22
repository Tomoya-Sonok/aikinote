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
        <div className={styles.stepContainer}>
          <div className={styles.stepInfo}>
            <div className={styles.stepHeader}>
              <span className={styles.stepText}>{t("auth.signupStep3")}</span>
            </div>
            <div className={styles.progressContainer}>
              <div
                className={`${styles.progressBar} ${styles.progressStep3}`}
              />
            </div>
          </div>
          <div className={styles.stepDots}>
            <div className={styles.stepDot} />
            <div className={styles.stepDot} />
            <div className={styles.stepDot} />
            <div className={`${styles.stepDot} ${styles.stepDotInactive}`} />
          </div>
        </div>
        <div className={styles.contentsWrapper}>
          <div className={styles.stepText}>{t("auth.emailVerificationTitle")}</div>

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
