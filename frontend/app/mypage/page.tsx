"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { TabNavigation } from "@/components/navigation/TabNavigation";
import styles from "./mypage.module.css";

export default function MyPage() {
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		const checkAuth = async () => {
			try {
				const authUser = await getCurrentUser();

				if (!authUser) {
					// 開発環境以外ではログインページにリダイレクト
					if (process.env.NODE_ENV !== "development") {
						router.push("/login");
						return;
					}
				}
			} catch (err) {
				console.error("Authentication check failed:", err);
				const isDocker = process.env.NEXT_PUBLIC_IS_DOCKER === "true";
				if (process.env.NODE_ENV !== "development" || isDocker) {
					router.push("/login");
					return;
				}
			} finally {
				setLoading(false);
			}
		};

		checkAuth();
	}, [router]);

	if (loading) {
		return <div className={styles.container}>読み込み中...</div>;
	}

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<h1>マイページ</h1>
				<p>こちらのページは後ほど実装予定です。</p>
			</div>
			
			{/* タブナビゲーション */}
			<TabNavigation />
		</div>
	);
}
