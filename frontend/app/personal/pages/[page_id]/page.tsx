"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Tag } from "@/components/atoms/Tag/Tag";
import { TabNavigation } from "@/components/molecules/TabNavigation/TabNavigation";
import { AppLayout } from "@/components/layout/AppLayout";
import {
	mockGetTrainingPageDataById,
	type TrainingPageData,
} from "@/lib/server/msw/training";
import styles from "./page.module.css";

export default function PageDetailPage() {
	const [loading, setLoading] = useState(true);
	const [pageData, setPageData] = useState<TrainingPageData | null>(null);
	const router = useRouter();
	const params = useParams();
	const pageId = params.page_id as string;

	useEffect(() => {
		const fetchData = async () => {
			try {
				if (pageId) {
					const data = await mockGetTrainingPageDataById(pageId);
					setPageData(data);
				}
			} catch (err) {
				console.error("Failed to fetch page data:", err);
				setPageData(null);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [pageId]);

	const handleBackToList = () => {
		router.push("/personal/pages");
	};

	const handleEdit = () => {
		// TODO: 編集機能の実装（API実装後）
		console.log("Edit page:", pageId);
	};

	const handleDelete = () => {
		// TODO: 削除機能の実装（API実装後）
		console.log("Delete page:", pageId);
	};

	if (loading) {
		return (
			<AppLayout>
				<div className={styles.container}>
					<div className={styles.contentArea}>
						<div className={styles.notFound}>読み込み中...</div>
					</div>
				</div>
			</AppLayout>
		);
	}

	if (!pageData) {
		return (
			<AppLayout>
				<div className={styles.container}>
					<div className={styles.contentArea}>
						<div className={styles.notFound}>ページが見つかりませんでした</div>
						<div className={styles.buttonsContainer}>
							<button
								type="button"
								className={styles.backButton}
								onClick={handleBackToList}
							>
								ページ一覧に戻る
							</button>
						</div>
					</div>
				</div>
			</AppLayout>
		);
	}

	// コンテンツを稽古内容とコメントに分割（特定の判定ロジックを使用）
	const contentLines = pageData.content.split("\n\n");
	let trainingContent = "";
	let comments = "";

	if (contentLines.length > 2) {
		// 複数のパラグラフがある場合、最後のパラグラフをコメントとして扱う
		trainingContent = contentLines.slice(0, -1).join("\n\n");
		comments = contentLines[contentLines.length - 1];
	} else {
		// パラグラフが少ない場合は全てを稽古内容とする
		trainingContent = pageData.content;
		comments = "";
	}

	return (
		<AppLayout>
			<div className={styles.container}>
				<div className={styles.contentArea}>
					{/* ヘッダー部分 */}
					<div className={styles.header}>
						<h1 className={styles.title}>{pageData.title}</h1>

						{/* タグ表示 */}
						<div className={styles.tagsContainer}>
							{pageData.tags.map((tag) => (
								<Tag key={tag}>{tag}</Tag>
							))}
						</div>
					</div>

					{/* 稽古内容セクション */}
					<div className={styles.section}>
						<h2 className={styles.sectionTitle}>稽古内容</h2>
						<div className={styles.divider} />
						<div className={styles.content}>{trainingContent}</div>
					</div>

					{/* その他・コメントセクション */}
					{comments && (
						<div className={styles.section}>
							<h2 className={styles.sectionTitle}>その他・コメント</h2>
							<div className={styles.divider} />
							<div className={styles.content}>{comments}</div>
						</div>
					)}

					{/* アクションボタン */}
					<div className={styles.buttonsContainer}>
						<button
							type="button"
							className={styles.backButton}
							onClick={handleBackToList}
						>
							ページ一覧に戻る
						</button>
						<button
							type="button"
							className={styles.editButton}
							onClick={handleEdit}
						>
							編集
						</button>
						<button
							type="button"
							className={styles.deleteButton}
							onClick={handleDelete}
						>
							削除
						</button>
					</div>
				</div>

				<TabNavigation />
			</div>
		</AppLayout>
	);
}
