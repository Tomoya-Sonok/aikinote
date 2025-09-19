import { redirect } from "next/navigation";
import { DefaultLayout } from "@/components/layouts/DefaultLayout";
import { getCurrentUser } from "@/lib/server/auth";
import { buildMetadata } from "@/lib/metadata";
import MyPageClient from "./MyPageClient";
import styles from "./page.module.css";

export default async function MyPage() {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/login");
	}

	// 初期データとして基本的な認証ユーザー情報を使用
	const initialProfile = {
		id: user.id,
		email: user.email || "",
		username: user.username || "未設定",
		profile_image_url: user.profile_image_url || null,
		dojo_style_name: null,
		training_start_date: null,
		publicity_setting: "private" as const,
		language: "ja",
		is_email_verified: true,
		password_hash: "",
	};

	return (
		<DefaultLayout settingsHref="/settings">
			<div className={styles.container}>
				<div className={styles.content}>
					<MyPageClient initialUser={initialProfile} />
				</div>
			</div>
		</DefaultLayout>
	);
}

export const metadata = buildMetadata({
	title: "マイページ",
	description: "ご自身のプロフィールと活動状況を確認できます。",
});
