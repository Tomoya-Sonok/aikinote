import type { Metadata } from "next";
import Link from "next/link";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import { buildMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

export const metadata: Metadata = buildMetadata({
	title: "認証エラー",
	description: "認証処理中にエラーが発生しました",
});

export default function AuthErrorPage({
	searchParams,
}: {
	searchParams: { error?: string };
}) {
	const error = searchParams.error;

	const getErrorMessage = (errorCode?: string) => {
		switch (errorCode) {
			case "Configuration":
				return "認証設定に問題があります。管理者にお問い合わせください。";
			case "AccessDenied":
				return "アクセスが拒否されました。必要な権限がない可能性があります。";
			case "Verification":
				return "認証トークンが無効か期限切れです。";
			default:
				return "認証処理中にエラーが発生しました。しばらくしてからもう一度お試しください。";
		}
	};

	return (
		<MinimalLayout headerTitle="認証エラー" backHref="/login">
			<div className={styles.container}>
				<h1 className={styles.title}>認証エラー</h1>

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
					<h2 className={styles.errorTitle}>認証エラー</h2>
					<p className={styles.errorMessage}>{getErrorMessage(error)}</p>

					{error && (
						<div className={styles.errorCode}>
							<p className={styles.errorCodeText}>エラーコード: {error}</p>
						</div>
					)}

					<div className={styles.buttonContainer}>
						<Link
							href="/login"
							className={`${styles.button} ${styles.primaryButton}`}
						>
							ログインページに戻る
						</Link>
						<Link
							href="/signup"
							className={`${styles.button} ${styles.secondaryButton}`}
						>
							新規登録
						</Link>
					</div>
				</div>
			</div>
		</MinimalLayout>
	);
}
