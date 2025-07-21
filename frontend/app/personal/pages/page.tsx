"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrainingCard } from "@/components/training/TrainingCard";
import { TabNavigation } from "@/components/navigation/TabNavigation";
import { FilterSection } from "@/components/filter/FilterSection";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { getCurrentUser, getUserProfile, signOut } from "@/lib/server/auth";
import styles from "./personal-pages.module.css";

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

// モックデータ
const mockTrainingData = [
	{
		id: "1",
		title: "2025-09-09 10月の審査に向けて",
		content:
			"初級者の審査に向けて、正面打ち〜一教や入身投げが中心の稽古だった。受けも取りも、手刀を維持したまま体捌きを意識し ...",
		date: "2025-09-09",
		tags: ["一教", "立技", "正面打ち"],
	},
	{
		id: "2",
		title: "2025-09-17 剣の理合いを意識する",
		content:
			"西尾先生の剣の理合いに基づいた三教が興味深かった。正面打ちや横面打ちに対して、後の先をとる意識で入身と当身を行い ...",
		date: "2025-09-17",
		tags: ["三教", "四教", "立技", "正面打ち", "横面打ち", "小手返し"],
	},
	{
		id: "3",
		title: "2025-09-21",
		content:
			"初級者の審査に向けて、正面打ち→一教や入身投げが中心の稽古だった。受けも取りも、手刀を維持したまま体捌きを意識し ...",
		date: "2025-09-21",
		tags: ["一教", "立技", "正面打ち", "入身投げ"],
	},
];

export default function PersonalPagesPage() {
	const [user, setUser] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState("personal");
	const [filteredData, setFilteredData] = useState(mockTrainingData);
	const router = useRouter();

	useEffect(() => {
		const fetchUserProfile = async () => {
			try {
				// 認証中のユーザーを取得
				const authUser = await getCurrentUser();

				if (!authUser) {
					// 開発環境以外ではログインページにリダイレクト
					if (process.env.NODE_ENV !== "development") {
						router.push("/login");
						return;
					}
					// 開発環境では処理を続行（authUserがnullでもgetUserProfileでモックデータを返す）
				}

				// ユーザープロフィールを取得
				const { data, error } = await getUserProfile(
					authUser?.id || "mock-user-123",
				);

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

	const handleTabChange = (tabId: string) => {
		setActiveTab(tabId);
		// タブに応じて他のページに遷移
		if (tabId === "social") {
			router.push("/social/posts");
		} else if (tabId === "mypage") {
			router.push("/mypage");
		} else if (tabId === "personal") {
			router.push("/personal/pages");
		}
	};

	const handleSearchChange = (search: string) => {
		const filtered = mockTrainingData.filter(
			(item) =>
				item.title.toLowerCase().includes(search.toLowerCase()) ||
				item.content.toLowerCase().includes(search.toLowerCase()) ||
				item.tags.some((tag) =>
					tag.toLowerCase().includes(search.toLowerCase()),
				),
		);
		setFilteredData(filtered);
	};

	const handleDateFilterChange = (date: string | null) => {
		// 日付フィルタリングロジック
		console.log("Date filter:", date);
	};

	const handleTagFilterChange = (tags: string[]) => {
		// タグフィルタリングロジック
		console.log("Tag filter:", tags);
	};

	const handleCreatePage = () => {
		router.push("/create");
	};

	const handleEditTraining = (id: string) => {
		router.push(`/edit/${id}`);
	};

	const handleDeleteTraining = (id: string) => {
		setFilteredData((prev) => prev.filter((item) => item.id !== id));
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

	return (
		<div className={styles.container}>
			{/* ロゴエリア */}
			<div className={styles.logoArea}>
				<div className={styles.logo} />
			</div>

			{/* 統計エリア */}
			<div className={styles.statsSection}>
				<p className={styles.statsText}>
					これまでに作成したページ数は
					<span className={styles.statsNumber}>18</span>
					ページです
				</p>
			</div>

			{/* フィルタセクション */}
			<FilterSection
				onSearchChange={handleSearchChange}
				onDateFilterChange={handleDateFilterChange}
				onTagFilterChange={handleTagFilterChange}
			/>

			{/* ページ情報表示 */}
			<div className={styles.pageInfo}>
				<h2 className={styles.pageTitle}>最近作成したページ</h2>
				<p className={styles.pageCount}>全18件表示中</p>
			</div>

			{/* 稽古記録リスト */}
			<div className={styles.trainingList}>
				{filteredData.map((training) => (
					<TrainingCard
						key={training.id}
						{...training}
						onEdit={() => handleEditTraining(training.id)}
						onDelete={() => handleDeleteTraining(training.id)}
					/>
				))}
			</div>

			{/* フローティングアクションボタン */}
			<FloatingActionButton onClick={handleCreatePage} />

			{/* タブナビゲーション */}
			<TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
		</div>
	);
}
