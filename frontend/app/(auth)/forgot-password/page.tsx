import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { AppLayout } from "@/components/layout/AppLayout";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "パスワードリセット",
  description:
    "パスワードをお忘れの場合は、登録されたメールアドレスにリセット用のリンクをお送りします",
};

export default function ForgotPasswordPage() {
  return (
    <AppLayout>
      <div className={styles.container}>
        <h1 className={styles.title}>パスワードリセット</h1>
        <div className={styles.formCard}>
          <ForgotPasswordForm />
        </div>
      </div>
    </AppLayout>
  );
}
