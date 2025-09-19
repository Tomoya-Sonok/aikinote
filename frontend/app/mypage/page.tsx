import { redirect } from "next/navigation";
import { DefaultLayout } from "@/components/layouts/DefaultLayout";
import { MyPageContent } from "@/components/organisms/MyPageContent/MyPageContent";
import { getCurrentUser, getUserProfile } from "@/lib/server/auth";
import { buildMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

export default async function MyPage() {
	// ログ出力でデバッグ
	if (process.env.NODE_ENV === "development") {
		console.log("MyPage: Starting authentication check");
	}

	const user = await getCurrentUser();

	if (!user) {
		if (process.env.NODE_ENV === "development") {
			console.log("MyPage: No user found, redirecting to login");
		}
		redirect("/login");
	}

	if (process.env.NODE_ENV === "development") {
		console.log("MyPage: User authenticated:", {
			userId: user.id,
			username: user.username,
		});
	}

	// ユーザープロフィールを取得
	const { data: userProfile, error } = await getUserProfile(user.id);

	if (error || !userProfile) {
		console.error("ユーザープロフィール取得エラー:", error);
		if (process.env.NODE_ENV === "development") {
			console.log("MyPage: Profile fetch error, redirecting to login");
		}
		redirect("/login");
	}

	// プロフィールが存在しない場合はデフォルト値を使用
	const profile = userProfile || {
		id: user.id,
		email: user.email || "",
		username: user.username || "未設定",
		profile_image_url: user.profile_image_url || null,
		dojo_id: null,
		training_start_date: null,
		publicity_setting: "private",
		language: "ja",
		is_email_verified: true,
		password_hash: "",
	};

	return (
		<DefaultLayout settingsHref="/settings">
			<div className={styles.container}>
				<div className={styles.content}>
					<MyPageContent user={profile} />
				</div>
			</div>
		</DefaultLayout>
	);
}

export const metadata = buildMetadata({
	title: "マイページ",
	description: "ご自身のプロフィールと活動状況を確認できます。",
});
