import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import { buildMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

export const metadata: Metadata = buildMetadata({
	title: "パスワードリセット",
	description:
		"パスワードをお忘れの場合は、登録されたメールアドレスにリセット用のリンクをお送りします",
});

export default function ForgotPasswordPage() {
	return (
		<MinimalLayout headerTitle="パスワードリセット" backHref="/login">
			<div className={styles.container}>
				<h1 className={styles.title}>パスワードリセット</h1>
				<div className={styles.formCard}>
					<ForgotPasswordForm />
				</div>
			</div>
		</MinimalLayout>
	);
}
