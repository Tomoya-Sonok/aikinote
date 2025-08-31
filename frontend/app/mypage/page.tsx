import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { TabNavigation } from "@/components/molecules/TabNavigation/TabNavigation";
import { AppLayout } from "@/components/layout/AppLayout";
import styles from "./mypage.module.css";

export default async function MyPage() {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/login");
	}

	return (
		<AppLayout>
			<div className={styles.container}>
				<div className={styles.content}>
					<h1>マイページ</h1>
					<p>こちらのページは後ほど実装予定です。</p>
				</div>

				{/* タブナビゲーション */}
				<TabNavigation />
			</div>
		</AppLayout>
	);
}
