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

export function SocialPostsFeed() {
  const { user } = useAuth();
  const locale = useLocale();
  const tPremium = useTranslations("premiumModalBrowse");
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalKey, setUpgradeModalKey] =
    useState<string>("premiumModalBrowse");

  const isFreeUser = !subLoading && !isPremium;

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
      if (isFreeUser) {
        setShowUpgradeModal(true);
        return;
      }
      handleToggleFavorite(postId, posts, updatePost);
    },
    [isFreeUser, handleToggleFavorite, posts, updatePost],
  );

  const handlePostClick = useCallback(
    (postId: string) => {
      window.location.href = `/${locale}/social/posts/${postId}`;
    },
    [locale],
  );

  const handleTabChange = useCallback(
    (tab: SocialTab) => {
      if (isFreeUser && tab === "favorites") {
        setShowUpgradeModal(true);
        return;
      }
      setActiveTab(tab);
      const url = new URL(window.location.href);
      if (tab === "all") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.replaceState(null, "", url.toString());
    },
    [isFreeUser],
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
                isFreeUser={isFreeUser}
                onPremiumAction={() => setShowUpgradeModal(true)}
              />
            ))}

            {isFreeUser ? (
              <div className={styles.feedBottomCta}>
                <p className={styles.feedBottomCtaTitle}>
                  {tPremium("feedBottomTitle")}
                </p>
                <button
                  type="button"
                  className={styles.feedBottomCtaButton}
                  onClick={() => setShowUpgradeModal(true)}
                >
                  {tPremium("feedBottomButton")}
                </button>
              </div>
            ) : (
              <div ref={sentinelRef} className={styles.sentinel}>
                {isLoadingMore && <Loader size="small" centered />}
                {!hasMore && posts.length > 0 && (
                  <p className={styles.noMore}>{t("noMorePosts")}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <FloatingActionButton
        href={isPremium ? `/${locale}/social/posts/new` : undefined}
        onClick={
          isFreeUser
            ? () => {
                setUpgradeModalKey("premiumModal");
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
