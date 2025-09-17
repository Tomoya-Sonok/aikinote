"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { AppLayout } from "../layout/AppLayout";
import styles from "./EmailVerificationForm.module.css";

interface EmailVerificationFormProps {
  token: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function EmailVerificationForm({
  token,
  onSuccess,
  onError,
}: EmailVerificationFormProps) {
  const [verificationStatus, setVerificationStatus] = useState<
    "loading" | "success" | "error"
  >("loading");
  const [_errorMessage, setErrorMessage] = useState<string>("");
  const { verifyEmail } = useAuth();

  useEffect(() => {
    console.log("=== EmailVerificationForm useEffect called ===");
    console.log("Token:", token ? `${token.slice(0, 10)}...` : "NULL");
    console.log("Verification status:", verificationStatus);

    const performVerification = async () => {
      try {
        console.log("=== Starting email verification ===");
        console.log(
          "Calling verifyEmail with token:",
          token ? `${token.slice(0, 10)}...` : "NULL",
        );

        await verifyEmail(token);

        console.log("=== Email verification successful ===");
        setVerificationStatus("success");
        onSuccess?.();
      } catch (err) {
        console.error("=== Email verification failed ===", err);
        const message =
          err instanceof Error ? err.message : "メール認証に失敗しました";
        setErrorMessage(message);
        setVerificationStatus("error");
        onError?.(message);
      }
    };

    if (token && verificationStatus === "loading") {
      performVerification();
    } else if (!token) {
      setErrorMessage("認証トークンが無効です");
      setVerificationStatus("error");
    }
  }, [token, verifyEmail, onSuccess, onError, verificationStatus]);

  if (verificationStatus === "loading") {
    return (
      <AppLayout>
        <div className={styles.container}>
          <h1 className={styles.title}>新規登録</h1>

          <div className={styles.formCard}>
            {/* ステップインジケーター */}
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
                <div className={`${styles.stepDot}`} />
                <div className={`${styles.stepDot}`} />
                <div className={`${styles.stepDot}`} />
                <div
                  className={`${styles.stepDot} ${styles.stepDotInactive}`}
                />
              </div>
            </div>
            <h2 className={styles.loadingTitle}>メール認証中</h2>
            <p className={styles.loadingMessage}>
              メールアドレスの認証を処理しています。しばらくお待ちください...
            </p>
            <div className={styles.loadingSpinner} />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (verificationStatus === "success") {
    return (
      <AppLayout>
        <div className={styles.container}>
          <h1 className={styles.title}>新規登録</h1>

          <div className={styles.formCard}>
            {/* ステップインジケーター */}
            <div className={styles.stepContainer}>
              <div className={styles.stepInfo}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepText}>ステップ 4/4</span>
                </div>
                <div className={styles.progressContainer}>
                  <div
                    className={`${styles.progressBar} ${styles.progressStep4}`}
                  />
                </div>
              </div>
              <div className={styles.stepDots}>
                <div className={`${styles.stepDot} ${styles.stepDotActive}`} />
                <div className={`${styles.stepDot} ${styles.stepDotActive}`} />
                <div className={`${styles.stepDot} ${styles.stepDotActive}`} />
                <div className={`${styles.stepDot} ${styles.stepDotActive}`} />
              </div>
            </div>

            <div className={styles.successContainer}>
              <div className={styles.successTextContainer}>
                <div className={styles.stepText}>メール認証完了</div>
                <p className={styles.completionMessage}>
                  お疲れさまでした！新規登録完了です！
                </p>
              </div>
              <Link
                role="button"
                href="/personal/pages"
                className={`${styles.button} ${styles.primaryButton}`}
              >
                AikiNoteをはじめる
              </Link>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className={styles.container}>
        <h1 className={styles.title}>新規登録</h1>

        <div className={styles.formCard}>
          {/* ステップインジケーター */}
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
              <div className={`${styles.stepDot}`} />
              <div className={`${styles.stepDot}`} />
              <div className={`${styles.stepDot}`} />
              <div className={`${styles.stepDot} ${styles.stepDotInactive}`} />
            </div>
          </div>
          <div className={styles.errorContentsWrapper}>
            <h2 className={styles.errorTitle}>認証に失敗しました</h2>
            <div className={styles.errorDetails}>
              <p className={styles.errorDetailsTitle}>認証に失敗する原因：</p>
              <ul className={styles.errorDetailsList}>
                <li className={styles.errorDetailsItem}>
                  認証リンクの有効期限が切れている（1時間）
                </li>
                <li className={styles.errorDetailsItem}>
                  既に認証済みのアカウント
                </li>
                <li className={styles.errorDetailsItem}>無効な認証トークン</li>
              </ul>
            </div>
          </div>

          <div className={styles.buttonContainer}>
            <Link
              href="/signup"
              className={`${styles.button} ${styles.primaryButton}`}
            >
              新規登録をやり直す
            </Link>
            <Link
              href="/login"
              className={`${styles.button} ${styles.secondaryButton}`}
            >
              ログインページへ
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
