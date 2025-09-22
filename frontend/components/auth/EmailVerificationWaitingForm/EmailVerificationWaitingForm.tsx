"use client";

import styles from "../EmailVerificationForm/EmailVerificationForm.module.css";

/**
 * メール認証待機画面（ステップ3）
 * メール送信後、ユーザーがメール内のリンクをクリックするまでの待機画面
 */
export function EmailVerificationWaitingForm() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>新規登録</h1>

      <div className={styles.formCard}>
        <div className={styles.stepContainer}>
          <div className={styles.stepInfo}>
            <div className={styles.stepHeader}>
              <span className={styles.stepText}>ステップ 3/4</span>
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
          <div className={styles.stepText}>メール認証</div>

          <div className={styles.emailSentMessage}>
            ご入力いただいたメールアドレス宛てに認証用メールをお送りしました。
            {"\n"}
            30分以内にメール内の認証ボタンを押下してください。
          </div>
        </div>
      </div>
    </div>
  );
}
