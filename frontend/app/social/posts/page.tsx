"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { TabNavigation } from "@/components/molecules/TabNavigation/TabNavigation";
import {
	type MockUser,
	mockGetCurrentUser,
	mockGetSocialPosts,
	type SocialPost,
} from "@/lib/server/msw/training";
import styles from "./page.module.css";

export default function SocialPostsPage() {
	const [_user, setUser] = useState<MockUser | null>(null);
	const [posts, setPosts] = useState<SocialPost[]>([]);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		const checkAuthAndFetchData = async () => {
			try {
				// MSW環境でのモック認証チェック
				const currentUser = await mockGetCurrentUser();

				if (!currentUser) {
					router.push("/login");
					return;
				}

				setUser(currentUser);

				// ソーシャル投稿データを取得
				const socialPosts = await mockGetSocialPosts();
				setPosts(socialPosts);
			} catch (error) {
				console.error("認証エラーまたはデータ取得エラー:", error);
				router.push("/login");
			} finally {
				setLoading(false);
			}
		};

		checkAuthAndFetchData();
	}, [router]);

	if (loading) {
		return (
			<AppLayout>
				<div className={styles.container}>
					<div className={styles.content}>
						<p>読み込み中...</p>
					</div>
				</div>
			</AppLayout>
		);
	}

	return (
		<AppLayout>
			<div className={styles.container}>
				<div className={styles.content}>
					<h1>みんなで 投稿一覧</h1>

					{posts.length > 0 ? (
						<div className={styles.postsList}>
							{posts.map((post) => (
								<div key={post.id} className={styles.postCard}>
									<h3 className={styles.postTitle}>{post.title}</h3>
									<p className={styles.postContent}>{post.content}</p>
									<div className={styles.postMeta}>
										<span className={styles.postAuthor}>
											投稿者: {post.authorName}
										</span>
										<span className={styles.postDate}>
											{new Date(post.createdAt).toLocaleDateString("ja-JP")}
										</span>
									</div>
									<div className={styles.postStats}>
										<span className={styles.likesCount}>
											👍 {post.likesCount}
										</span>
										<span className={styles.commentsCount}>
											💬 {post.commentsCount}
										</span>
									</div>
									{post.tags.length > 0 && (
										<div className={styles.postTags}>
											{post.tags.map((tag) => (
												<span key={`${post.id}-${tag}`} className={styles.tag}>
													#{tag}
												</span>
											))}
										</div>
									)}
								</div>
							))}
						</div>
					) : (
						<p>投稿がありません。</p>
					)}
				</div>

				{/* タブナビゲーション */}
				<TabNavigation />
			</div>
		</AppLayout>
	);
}
