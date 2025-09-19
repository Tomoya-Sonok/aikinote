import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/SignInForm";
import { NotLoggedInLayout } from "@/components/layouts/NotLoggedInLayout";
import { buildMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

export const metadata: Metadata = buildMetadata({
	title: "ログイン",
	description: "アカウントにログインしてサービスをご利用ください",
});

export default function LoginPage() {
	return (
		<NotLoggedInLayout>
			<div className={styles.container}>
				<h1 className={styles.title}>ログイン</h1>
				<div className={styles.formCard}>
					<SignInForm />
				</div>
			</div>
		</NotLoggedInLayout>
	);
}
