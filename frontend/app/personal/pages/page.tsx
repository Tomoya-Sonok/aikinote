"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { FloatingActionButton } from "@/components/atoms/FloatingActionButton/FloatingActionButton";
import { AppLayout } from "@/components/layout/AppLayout";
import { FilterArea } from "@/components/molecules/FilterArea/FilterArea";
import { TabNavigation } from "@/components/molecules/TabNavigation/TabNavigation";
import { TrainingCard } from "@/components/molecules/TrainingCard/TrainingCard";
import {
	type PageCreateData,
	PageCreateModal,
} from "@/components/organisms/PageCreateModal/PageCreateModal";
import { TagFilterModal } from "@/components/organisms/TagFilterModal/TagFilterModal"; // インポート
import {
	type CreatePagePayload,
	createPage,
	getPages,
	getTags,
} from "@/lib/api/client";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { type TrainingPageData } from "@/lib/server/msw/training";
import styles from "./page.module.css";

const PAGE_LIMIT = 18;

// タグの型定義
interface Tag {
	id: string;
	name: string;
}

export default function PersonalPagesPage() {
	const [loading, setLoading] = useState(true);
	const [allTrainingPageData, setAllTrainingPageData] = useState<
		TrainingPageData[]
	>([]);
	const [isPageCreateModalOpen, setPageCreateModalOpen] = useState(false);
	const router = useRouter();
	const { data: session, status } = useSession();

	const [searchQuery, setSearchQuery] = useState("");
	const debouncedSearchQuery = useDebounce(searchQuery, 300);
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const [selectedTags, setSelectedTags] = useState<string[]>([]); // 選択されたタグ名
	const [displayedItemsCount, setDisplayedItemsCount] = useState(PAGE_LIMIT);

	const [isTagModalOpen, setIsTagModalOpen] = useState(false);
	const [availableTags, setAvailableTags] = useState<Tag[]>([]); // 利用可能なタグ一覧

	useEffect(() => {
		const fetchAllData = async () => {
			if (!session?.user?.id) {
				setLoading(false);
				return;
			}

			setLoading(true);

			try {
				const response = await getPages({
					userId: session.user.id,
					limit: 1000,
					offset: 0,
					query: "",
					tags: [],
					date: undefined,
				});

				if (response.success && response.data) {
					const trainingPageDataResult: TrainingPageData[] =
						response.data.training_pages.map((item) => ({
							id: item.page.id,
							title: item.page.title,
							content: item.page.content,
							date: item.page.created_at.split("T")[0],
							tags: item.tags.map((tag) => tag.name),
						}));

					setAllTrainingPageData(trainingPageDataResult);
				} else {
					throw new Error(response.error || "データの取得に失敗しました");
				}
			} catch (err) {
				console.error("Failed to fetch training page data:", err);
				setAllTrainingPageData([]);
			} finally {
				setLoading(false);
			}
		};

		fetchAllData();
	}, [session]);

	useEffect(() => {
		if (
			debouncedSearchQuery !== undefined ||
			selectedTags !== undefined ||
			selectedDate !== undefined
		) {
			setDisplayedItemsCount(PAGE_LIMIT);
		}
	}, [debouncedSearchQuery, selectedTags, selectedDate]);

	const filteredTrainingPageData = useMemo(() => {
		let filtered = allTrainingPageData;

		if (debouncedSearchQuery.trim()) {
			filtered = filtered.filter(
				(page) =>
					page.title
						.toLowerCase()
						.includes(debouncedSearchQuery.toLowerCase()) ||
					page.content
						.toLowerCase()
						.includes(debouncedSearchQuery.toLowerCase()),
			);
		}

		if (selectedTags.length > 0) {
			filtered = filtered.filter((page) =>
				selectedTags.every((selectedTag) =>
					page.tags.some((pageTag) => pageTag === selectedTag),
				),
			);
		}

		if (selectedDate) {
			filtered = filtered.filter((page) => page.date === selectedDate);
		}

		return filtered;
	}, [allTrainingPageData, debouncedSearchQuery, selectedTags, selectedDate]);

	const displayedTrainingPageData = useMemo(() => {
		return filteredTrainingPageData.slice(0, displayedItemsCount);
	}, [filteredTrainingPageData, displayedItemsCount]);

	const hasMore = filteredTrainingPageData.length > displayedItemsCount;

	useEffect(() => {
		const fetchTags = async () => {
			if (!session?.user?.id) return;
			try {
				const response = await getTags(session.user.id);
				if (response.success && response.data) {
					setAvailableTags(response.data); // オブジェクトの配列をそのままセット
				} else {
					console.error("Failed to fetch tags:", response.error);
				}
			} catch (err) {
				console.error("Failed to fetch tags:", err);
			}
		};
		fetchTags();
	}, [session]);

	const handleLoadMore = () => {
		setDisplayedItemsCount((prev) => prev + PAGE_LIMIT);
	};

	const handleSearchChange = (search: string) => {
		setSearchQuery(search);
	};

	const handleDateFilterChange = (date: string | null) => {
		setSelectedDate(date);
	};

	const handleTagClick = (tagName: string) => {
		setSelectedTags((prev) =>
			prev.includes(tagName)
				? prev.filter((t) => t !== tagName)
				: [...prev, tagName],
		);
	};

	const handleCreatePage = () => {
		setPageCreateModalOpen(true);
	};

	const handleSavePage = async (pageData: PageCreateData) => {
		try {
			if (!session?.user?.id) {
				throw new Error("ログインが必要です");
			}

			const userId = session.user.id;

			const payload: CreatePagePayload = {
				title: pageData.title.trim(),
				tori: pageData.tori,
				uke: pageData.uke,
				waza: pageData.waza,
				content: pageData.content,
				comment: pageData.comment,
				user_id: userId,
			};

			const response = await createPage(payload);

			if (response.success && response.data) {
				const newPage: TrainingPageData = {
					id: response.data.page.id,
					title: response.data.page.title,
					content: response.data.page.content,
					date: response.data.page.created_at.split("T")[0],
					tags: response.data.tags.map((tag) => tag.name),
				};

				setAllTrainingPageData((prev) => [newPage, ...prev]);
			}

			setPageCreateModalOpen(false);
		} catch (error) {
			console.error("Failed to create page:", error);
			alert(
				error instanceof Error ? error.message : "ページの作成に失敗しました",
			);
		}
	};

	const handleEditTraining = (id: string) => {
		router.push(`/edit/${id}`);
	};

	const handleDeleteTraining = (id: string) => {
		setAllTrainingPageData((prev) => prev.filter((item) => item.id !== id));
	};

	const handleViewTraining = (id: string) => {
		router.push(`/personal/pages/${id}`);
	};

	if (status === "loading" || loading) {
		return (
			<AppLayout>
				<div className={styles.container}>読み込み中...</div>
			</AppLayout>
		);
	}

	if (status === "unauthenticated") {
		return (
			<AppLayout>
				<div className={styles.container}>
					<p>ログインが必要です。</p>
					<button type="button" onClick={() => router.push("/login")}>
						ログインページへ
					</button>
				</div>
			</AppLayout>
		);
	}

	return (
		<AppLayout>
			<div className={styles.container}>
				<div className={styles.statsSection}>
					<p className={styles.statsText}>
						これまでに作成したページ数は
						<span className={styles.statsNumber}>
							{allTrainingPageData.length}
						</span>
						ページです
					</p>
				</div>

				<FilterArea
					onSearchChange={handleSearchChange}
					onDateFilterChange={handleDateFilterChange}
					currentSearchQuery={searchQuery}
					currentSelectedDate={selectedDate}
					currentSelectedTags={selectedTags}
					onOpenTagSelection={() => setIsTagModalOpen(true)}
				/>

				<div className={styles.pageListWrapper}>
					<div className={styles.pageListDescription}>
						<h2 className={styles.pageTitle}>最近作成したページ</h2>
						<p className={styles.pageCount}>
							{allTrainingPageData.length === displayedTrainingPageData.length
								? `全${allTrainingPageData.length}件表示中`
								: `全${allTrainingPageData.length}件中
              ${displayedTrainingPageData.length}件表示中`}
						</p>
					</div>
					<div className={styles.trainingList}>
						{displayedTrainingPageData.map((training) => (
							<TrainingCard
								key={training.id}
								{...training}
								onClick={() => handleViewTraining(training.id)}
								onEdit={() => handleEditTraining(training.id)}
								onDelete={() => handleDeleteTraining(training.id)}
							/>
						))}
					</div>
					{hasMore && (
						<div className={styles.loadMoreContainer}>
							<button
								type="button"
								onClick={handleLoadMore}
								className={styles.loadMoreButton}
							>
								もっと見る
							</button>
						</div>
					)}
				</div>

				<FloatingActionButton onClick={handleCreatePage} />

				<TabNavigation />

				<PageCreateModal
					isOpen={isPageCreateModalOpen}
					onClose={() => setPageCreateModalOpen(false)}
					onSave={handleSavePage}
				/>

        {/* TagFilterModal の呼び出し */}
				<TagFilterModal
					isOpen={isTagModalOpen}
					onClose={() => setIsTagModalOpen(false)}
					tags={availableTags}
					selectedTags={selectedTags}
					onTagToggle={handleTagClick}
				/>
			</div>
		</AppLayout>
	);
}