import { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmailVerificationForm } from "@/components/auth/EmailVerificationForm";
import { AppLayout } from "@/components/layout/AppLayout";
import styles from "./page.module.css";

export const metadata: Metadata = {
	title: "メール認証",
	description: "メールアドレスの認証を完了してアカウントを有効化します",
};

function EmailVerificationContent({
	searchParams,
}: {
	searchParams: { token?: string };
}) {
	const token = searchParams.token;

	if (!token) {
		return (
			<AppLayout>
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
										className={`${styles.progressBar} ${styles.progressStep1}`}
									/>
								</div>
							</div>
							<div className={styles.stepDots}>
								<div className={`${styles.stepDot} ${styles.stepDotActive}`} />
								<div className={styles.stepDot} />
								<div className={styles.stepDot} />
								<div className={styles.stepDot} />
							</div>
						</div>
						<div className={styles.loginPrompt}>
							<span className={styles.loginPromptText}>
								認証トークンが見つかりません。有効な認証リンクをご利用ください。
								<Link href="/signup" className={styles.loginLink}>
									新規登録をやり直す
								</Link>
							</span>
						</div>
					</div>
				</div>
			</AppLayout>
		);
	}

	return <EmailVerificationForm token={token} />;
}

export default function VerifyEmailPage({
	searchParams,
}: {
	searchParams: { token?: string };
}) {
	return (
		<Suspense fallback={<div>読み込み中...</div>}>
			<EmailVerificationContent searchParams={searchParams} />
		</Suspense>
	);
}
