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
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/lib/hooks/useAuth";
import { useDailyLimits } from "@/lib/hooks/useDailyLimits";
import { useSocialFavorite } from "@/lib/hooks/useSocialFavorite";
import { useSocialFeed } from "@/lib/hooks/useSocialFeed";
import { useSwipeNavigation } from "@/lib/hooks/useSwipeNavigation";
import { useUnreadReplyPostIds } from "@/lib/hooks/useUnreadNotificationCount";
import { Link, useRouter } from "@/lib/i18n/routing";
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
  const router = useRouter();
  const t = useTranslations("socialPosts");
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SocialTab>(() =>
    parseTabParam(searchParams.get("tab")),
  );
  const { posts, isLoading, isLoadingMore, hasMore, loadMore, updatePost } =
    useSocialFeed(user?.id, activeTab);
  const { showToast } = useToast();
  const { handleToggleFavorite } = useSocialFavorite();
  const { canPost, isPremium, loading: dailyLimitsLoading } = useDailyLimits();
  const unreadReplyPostIds = useUnreadReplyPostIds(user?.id);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalKey, setUpgradeModalKey] =
    useState<string>("premiumModalBrowse");

  const updateTab = useCallback((tab: SocialTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "all") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.replaceState(null, "", url.toString());
  }, []);

  const handleSwipeTabChange = useCallback(
    (newTab: string): boolean => {
      if (newTab === "favorites" && !isPremium) {
        setUpgradeModalKey("premiumModalBrowse");
        setShowUpgradeModal(true);
        return false;
      }
      updateTab(newTab as SocialTab);
      return true;
    },
    [updateTab, isPremium],
  );

  const { containerRef, handlers, swipeProgress, isDragging } =
    useSwipeNavigation({
      tabs: VALID_TABS,
      activeTab,
      onTabChange: handleSwipeTabChange,
      enabled: !dailyLimitsLoading,
      excludeSelector: "[data-swipe-ignore]",
    });

  // Intersection Observer で無限スクロール
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  useEffect(() => {
    if (isLoading) return;
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
  }, [hasMore, isLoadingMore, isLoading]);

  const handleFavoriteToggle = useCallback(
    (postId: string) => {
      handleToggleFavorite(postId, posts, updatePost, () => {
        showToast(t("favoriteDailyLimitReached"), "error");
      });
    },
    [handleToggleFavorite, posts, updatePost, showToast, t],
  );

  const handlePostClick = useCallback(
    (postId: string) => {
      router.push(`/social/posts/${postId}`);
    },
    [router],
  );

  const emptyKey =
    activeTab === "all"
      ? "emptyAll"
      : activeTab === "training"
        ? "emptyTraining"
        : "emptyFavorites";

  return (
    <SocialLayout>
      <SocialFeedHeader profileImageUrl={user?.profile_image_url} />
      <SocialTabBar
        activeTab={activeTab}
        onTabChange={(tab) => handleSwipeTabChange(tab)}
        swipeProgress={isDragging ? swipeProgress : 0}
      />

      <div
        ref={containerRef}
        className={`${styles.feedContainer} ${isDragging ? styles.feedContainerSwiping : ""}`}
        {...handlers}
      >
        {isLoading ? (
          <SocialPostCardSkeleton />
        ) : posts.length === 0 ? (
          <p className={styles.emptyMessage}>{t(emptyKey)}</p>
        ) : (
          <>
            <Link
              href="/social/posts/new?from_minnade_promote_free_users_post_banner=1"
              className={styles.promoteBanner}
            >
              <img
                src={
                  locale === "en"
                    ? "/images/banner/en_minnade_promote_free_users_post.png"
                    : "/images/banner/minnade_promote_free_users_post.png"
                }
                alt={
                  locale === "en"
                    ? "Free for everyone! Start posting"
                    : "無料（Freeプラン）でも投稿できます"
                }
                className={styles.promoteBannerImage}
              />
            </Link>
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
              {isLoadingMore && <Loader size="large" centered />}
              {!hasMore && posts.length > 0 && (
                <p className={styles.noMore}>{t("noMorePosts")}</p>
              )}
            </div>
          </>
        )}
      </div>

      <FloatingActionButton
        href={canPost ? `/${locale}/social/posts/new` : undefined}
        onClick={
          !canPost
            ? () => {
                setUpgradeModalKey("premiumModalDailyLimit");
                setShowUpgradeModal(true);
              }
            : undefined
        }
        label={t("createPost")}
      />

      <PremiumUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          setUpgradeModalKey("premiumModalBrowse");
        }}
        translationKey={upgradeModalKey}
      />
    </SocialLayout>
  );
}
