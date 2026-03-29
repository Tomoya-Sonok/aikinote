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
import { PremiumUpgradeModal } from "@/components/shared/PremiumUpgradeModal/PremiumUpgradeModal";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSocialFavorite } from "@/lib/hooks/useSocialFavorite";
import { useSocialFeed } from "@/lib/hooks/useSocialFeed";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useUnreadReplyPostIds } from "@/lib/hooks/useUnreadNotificationCount";
import styles from "./page.module.css";

const VALID_TABS: SocialTab[] = ["all", "training", "favorites"];

const parseTabParam = (param: string | null): SocialTab => {
  if (param && VALID_TABS.includes(param as SocialTab)) {
    return param as SocialTab;
  }
  return "all";
};

const PREVIEW_TIMER_MS = 1000;

export function SocialPostsFeed() {
  const { user } = useAuth();
  const locale = useLocale();
  const tPremium = useTranslations("premiumModal");
  const t = useTranslations("socialPosts");
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SocialTab>(() =>
    parseTabParam(searchParams.get("tab")),
  );
  const { posts, isLoading, isLoadingMore, hasMore, loadMore, updatePost } =
    useSocialFeed(user?.id, activeTab);
  const { handleToggleFavorite } = useSocialFavorite();
  const { isPremium, loading: subLoading } = useSubscription();
  const unreadReplyPostIds = useUnreadReplyPostIds(user?.id);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showPreviewLock, setShowPreviewLock] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Free ユーザー: 1秒後にモーダル表示 + スクロールロック
  const modalShownRef = useRef(false);
  useEffect(() => {
    if (subLoading || isPremium || isLoading || modalShownRef.current) return;

    const timer = setTimeout(() => {
      modalShownRef.current = true;
      setShowUpgradeModal(true);
      document.body.style.overflow = "hidden";
    }, PREVIEW_TIMER_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [subLoading, isPremium, isLoading]);

  // previewLock 表示中はスクロールを無効化
  useEffect(() => {
    if (showPreviewLock) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [showPreviewLock]);

  // モーダル dismiss → previewLock を表示
  const handleDismissModal = useCallback(() => {
    setShowUpgradeModal(false);
    setShowPreviewLock(true);
  }, []);

  // Intersection Observer で無限スクロール
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreRef.current();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore]);

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
                hasUnreadReplies={unreadReplyPostIds.has(post.id)}
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

      {isPremium && (
        <FloatingActionButton
          href={`/${locale}/social/posts/new`}
          label={t("createPost")}
        />
      )}

      {showPreviewLock && (
        <div className={styles.previewLock}>
          <div className={styles.previewLockContent}>
            <p className={styles.previewLockTitle}>
              {tPremium("previewLockTitle")}
            </p>
            <button
              type="button"
              className={styles.previewLockButton}
              onClick={() => setShowUpgradeModal(true)}
            >
              {tPremium("previewLockButton")}
            </button>
          </div>
        </div>
      )}

      <PremiumUpgradeModal
        isOpen={showUpgradeModal}
        onClose={handleDismissModal}
      />
    </SocialLayout>
  );
}
