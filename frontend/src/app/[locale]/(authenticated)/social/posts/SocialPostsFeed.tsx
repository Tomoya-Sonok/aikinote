"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { SocialFeedHeader } from "@/components/features/social/SocialFeedHeader/SocialFeedHeader";
import {
  type SocialFeedPostData,
  SocialPostCard,
} from "@/components/features/social/SocialPostCard/SocialPostCard";
import { SocialPostCardSkeleton } from "@/components/features/social/SocialPostCard/SocialPostCardSkeleton";
import {
  type SocialTab,
  SocialTabBar,
} from "@/components/features/social/SocialTabBar/SocialTabBar";
import { FloatingActionButton } from "@/components/shared/FloatingActionButton/FloatingActionButton";
import { Loader } from "@/components/shared/Loader/Loader";
import { SocialLayout } from "@/components/shared/layouts/SocialLayout";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSocialFavorite } from "@/lib/hooks/useSocialFavorite";
import { useSocialFeed } from "@/lib/hooks/useSocialFeed";
import styles from "./page.module.css";

const VALID_TABS: SocialTab[] = ["all", "training", "favorites"];

const parseTabParam = (param: string | null): SocialTab => {
  if (param && VALID_TABS.includes(param as SocialTab)) {
    return param as SocialTab;
  }
  return "all";
};

export function SocialPostsFeed() {
  const { user } = useAuth();
  const locale = useLocale();
  const t = useTranslations("socialPosts");
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SocialTab>(() =>
    parseTabParam(searchParams.get("tab")),
  );
  const { posts, isLoading, isLoadingMore, hasMore, loadMore, updatePost } =
    useSocialFeed(user?.id, activeTab);
  const { handleToggleFavorite } = useSocialFavorite();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Intersection Observer で無限スクロール
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  const handleFavoriteToggle = useCallback(
    (postId: string) => {
      handleToggleFavorite(postId, posts, updatePost);
    },
    [handleToggleFavorite, posts, updatePost],
  );

  const handlePostClick = useCallback(
    (postId: string) => {
      window.location.href = `/${locale}/social/posts/${postId}`;
    },
    [locale],
  );

  const handleTabChange = useCallback((tab: SocialTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "all") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.replaceState(null, "", url.toString());
  }, []);

  const handleCreatePost = useCallback(() => {
    window.location.href = `/${locale}/social/posts/new`;
  }, [locale]);

  const emptyKey =
    activeTab === "all"
      ? "emptyAll"
      : activeTab === "training"
        ? "emptyTraining"
        : "emptyFavorites";

  return (
    <SocialLayout>
      <SocialFeedHeader profileImageUrl={user?.profile_image_url} />
      <SocialTabBar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className={styles.feedContainer}>
        {isLoading ? (
          <SocialPostCardSkeleton />
        ) : posts.length === 0 ? (
          <p className={styles.emptyMessage}>{t(emptyKey)}</p>
        ) : (
          <>
            {posts.map((post: SocialFeedPostData) => (
              <SocialPostCard
                key={post.id}
                post={post}
                currentUserId={user?.id ?? ""}
                onFavoriteToggle={handleFavoriteToggle}
                onClick={handlePostClick}
              />
            ))}

            <div ref={sentinelRef} className={styles.sentinel}>
              {isLoadingMore && <Loader size="small" centered />}
              {!hasMore && posts.length > 0 && (
                <p className={styles.noMore}>{t("noMorePosts")}</p>
              )}
            </div>
          </>
        )}
      </div>

      <FloatingActionButton
        onClick={handleCreatePost}
        label={t("createPost")}
      />
    </SocialLayout>
  );
}
