import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { TabNavigation } from "@/components/molecules/TabNavigation/TabNavigation";
import { AppLayout } from "@/components/layout/AppLayout";
import styles from "./social-posts.module.css";

export default async function SocialPostsPage() {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/login");
	}

	return (
		<AppLayout>
			<div className={styles.container}>
				<div className={styles.content}>
					<h1>みんなで 投稿一覧</h1>
					<p>こちらのページは後ほど実装予定です。</p>
				</div>

				{/* タブナビゲーション */}
				<TabNavigation />
			</div>
		</AppLayout>
	);
}
