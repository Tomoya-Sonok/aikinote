import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/SignInForm";
import { AppLayout } from "@/components/layout/AppLayout";
import styles from "./page.module.css";

export const metadata: Metadata = {
	title: "ログイン",
	description: "アカウントにログインしてサービスをご利用ください",
};

export default function LoginPage() {
	return (
		<AppLayout>
			<div className={styles.container}>
				<h1 className={styles.title}>ログイン</h1>
				<div className={styles.formCard}>
					<SignInForm />
				</div>
			</div>
		</AppLayout>
	);
}
