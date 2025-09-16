import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { AppLayout } from "@/components/layout/AppLayout";
import styles from "./page.module.css";

export const metadata: Metadata = {
	title: "新しいパスワードの設定",
	description:
		"新しいパスワードを設定してアカウントのセキュリティを保護しましょう",
};

function ResetPasswordContent({
	searchParams,
}: {
	searchParams: { token?: string };
}) {
	const token = searchParams.token;

	if (!token) {
		return (
			<div className={styles.formCard}>
				<div className={styles.errorIcon}>
					<svg
						width="48"
						height="48"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<title>エラーアイコン</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L5.351 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
				</div>
				<h2 className={styles.errorTitle}>無効なリンク</h2>
				<p className={styles.errorMessage}>
					パスワードリセットトークンが見つかりません。有効なリセットリンクをご利用ください。
				</p>
				<div className={styles.buttonContainer}>
					<Link
						href="/forgot-password"
						className={`${styles.button} ${styles.primaryButton}`}
					>
						パスワードリセットをやり直す
					</Link>
				</div>
			</div>
		);
	}

	return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage({
	searchParams,
}: {
	searchParams: { token?: string };
}) {
	return (
		<AppLayout>
			<div className={styles.container}>
				<h1 className={styles.title}>新しいパスワードの設定</h1>
				<Suspense fallback={<div>読み込み中...</div>}>
					<ResetPasswordContent searchParams={searchParams} />
				</Suspense>
			</div>
		</AppLayout>
	);
}
