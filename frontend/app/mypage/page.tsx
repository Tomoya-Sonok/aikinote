"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";
import { getCurrentUser, getUserProfile, signOut } from "@/lib/auth";
import styles from "./mypage.module.css";

type UserProfile = {
	id: string;
	username: string;
	email: string;
	profile_image_url: string | null;
	dojo_id: string | null;
	dojo_name?: string;
	training_start_date: string | null;
	publicity_setting: "public" | "dojo" | "private";
	language: "ja" | "en";
};

export default function MyPage() {
	const [user, setUser] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	useEffect(() => {
		const fetchUserProfile = async () => {
			try {
				// 認証中のユーザーを取得
				const authUser = await getCurrentUser();

				if (!authUser) {
					// ユーザーが認証されていない場合はログインページにリダイレクト
					router.push("/login");
					return;
				}

				// ユーザープロフィールを取得
				const { data, error } = await getUserProfile(authUser.id);

				if (error) {
					throw error;
				}

				setUser(data as UserProfile);
			} catch (err) {
				console.error("Failed to fetch user profile:", err);
				setError("ユーザープロフィールの取得に失敗しました");
			} finally {
				setLoading(false);
			}
		};

		fetchUserProfile();
	}, [router]);

	const handleLogout = async () => {
		try {
			const { error } = await signOut();

			if (error) {
				throw error;
			}

			// ログアウト成功後、ホームページにリダイレクト
			router.push("/");
		} catch (err) {
			console.error("Logout error:", err);
			alert("ログアウトに失敗しました");
		}
	};

	if (loading) {
		return <div className={styles.container}>読み込み中...</div>;
	}

	if (error || !user) {
		return (
			<div className={styles.container}>
				{error || "ユーザー情報を取得できませんでした"}
			</div>
		);
	}

	// 稽古開始日をフォーマット
	const formattedStartDate = user.training_start_date
		? new Date(user.training_start_date).toLocaleDateString("ja-JP", {
				year: "numeric",
				month: "long",
				day: "numeric",
			})
		: "未設定";

	// 公開設定の日本語表示
	const publicitySettingText = {
		public: "全員に公開",
		dojo: "道場のメンバーに公開",
		private: "非公開",
	}[user.publicity_setting];

	// 言語設定の日本語表示
	const languageText = {
		ja: "日本語",
		en: "英語",
	}[user.language];

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<Image
					src={user.profile_image_url || "/images/default-avatar.svg"}
					alt={user.username}
					width={100}
					height={100}
					className={styles.profileImage}
				/>

				<div className={styles.profileInfo}>
					<h1 className={styles.username}>{user.username}</h1>

					<div className={styles.dojoInfo}>
						{user.dojo_name ? `${user.dojo_name}所属` : "道場未設定"}
						{user.training_start_date && ` • 稽古開始: ${formattedStartDate}`}
					</div>

					<div className={styles.stats}>
						<div className={styles.stat}>
							<span className={styles.statValue}>125</span>
							<span className={styles.statLabel}>稽古記録</span>
						</div>
						<div className={styles.stat}>
							<span className={styles.statValue}>36</span>
							<span className={styles.statLabel}>投稿</span>
						</div>
						<div className={styles.stat}>
							<span className={styles.statValue}>18</span>
							<span className={styles.statLabel}>お気に入り</span>
						</div>
					</div>
				</div>

				<button type="button" className={styles.editButton}>
					プロフィール編集
				</button>
			</div>

			<div className={styles.section}>
				<h2 className={styles.sectionTitle}>アカウント設定</h2>

				<div className={styles.settingsList}>
					<div className={styles.settingItem}>
						<span className={styles.settingLabel}>メールアドレス</span>
						<span className={styles.settingValue}>{user.email}</span>
					</div>

					<div className={styles.settingItem}>
						<span className={styles.settingLabel}>公開範囲</span>
						<span className={styles.settingValue}>
							{publicitySettingText}
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								aria-hidden="true"
							>
								<title>矢印アイコン</title>
								<path
									d="M9 18L15 12L9 6"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</span>
					</div>

					<div className={styles.settingItem}>
						<span className={styles.settingLabel}>言語設定</span>
						<span className={styles.settingValue}>
							{languageText}
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								aria-hidden="true"
							>
								<title>矢印アイコン</title>
								<path
									d="M9 18L15 12L9 6"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</span>
					</div>
				</div>
			</div>

			<div className={styles.section}>
				<h2 className={styles.sectionTitle}>サポート</h2>

				<div className={styles.settingsList}>
					<div className={styles.settingItem}>
						<span className={styles.settingLabel}>ヘルプ・問い合わせ</span>
						<span className={styles.settingValue}>
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								aria-hidden="true"
							>
								<title>矢印アイコン</title>
								<path
									d="M9 18L15 12L9 6"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</span>
					</div>

					<div className={styles.settingItem}>
						<span className={styles.settingLabel}>利用規約</span>
						<span className={styles.settingValue}>
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								aria-hidden="true"
							>
								<title>矢印アイコン</title>
								<path
									d="M9 18L15 12L9 6"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</span>
					</div>

					<div className={styles.settingItem}>
						<span className={styles.settingLabel}>プライバシーポリシー</span>
						<span className={styles.settingValue}>
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								aria-hidden="true"
							>
								<title>矢印アイコン</title>
								<path
									d="M9 18L15 12L9 6"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</span>
					</div>
				</div>
			</div>

			<button
				type="button"
				className={styles.logoutButton}
				onClick={handleLogout}
			>
				ログアウト
			</button>
		</div>
	);
}
