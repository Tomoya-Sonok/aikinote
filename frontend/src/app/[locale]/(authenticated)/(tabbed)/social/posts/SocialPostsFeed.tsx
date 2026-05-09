"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type SocialFeedPostData,
  SocialPostCard,
} from "@/components/features/social/SocialPostCard/SocialPostCard";
import { SocialPostCardSkeleton } from "@/components/features/social/SocialPostCard/SocialPostCardSkeleton";
import {
  type SocialTab,
  SocialTabBar,
} from "@/components/features/social/SocialTabBar/SocialTabBar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { FloatingActionButton } from "@/components/shared/FloatingActionButton/FloatingActionButton";
import { Loader } from "@/components/shared/Loader/Loader";
import { PremiumUpgradeModal } from "@/components/shared/PremiumUpgradeModal/PremiumUpgradeModal";
import { PublicityConfirmDialog } from "@/components/shared/PublicityConfirmDialog/PublicityConfirmDialog";
import { RefetchErrorBanner } from "@/components/shared/RefetchErrorBanner/RefetchErrorBanner";
import { useToast } from "@/contexts/ToastContext";
import { blockUser, reportPost } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useDailyLimits } from "@/lib/hooks/useDailyLimits";
import { useSocialFavorite } from "@/lib/hooks/useSocialFavorite";
import { useSocialFeed } from "@/lib/hooks/useSocialFeed";
import { useSwipeNavigation } from "@/lib/hooks/useSwipeNavigation";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";
import { useUnreadReplyPostIds } from "@/lib/hooks/useUnreadNotificationCount";
import { Link, useRouter } from "@/lib/i18n/routing";
import { usePublicityConfirmStore } from "@/stores/publicityConfirmStore";
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
  const {
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    updatePost,
    refetch,
    isRefetchError,
  } = useSocialFeed(activeTab);
  const { showToast } = useToast();
  const { handleToggleFavorite } = useSocialFavorite();
  const { track } = useUmamiTrack();
  const { canPost, isPremium, loading: dailyLimitsLoading } = useDailyLimits();
  const unreadReplyPostIds = useUnreadReplyPostIds(user?.id);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalKey, setUpgradeModalKey] =
    useState<string>("premiumModalBrowse");
  const { hasConfirmedPublicity } = usePublicityConfirmStore();
  const [showPublicityDialog, setShowPublicityDialog] = useState(false);
  const [pendingBlock, setPendingBlock] = useState<{
    userId: string;
    username: string;
  } | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);

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
  // isLoading / hasMore / isLoadingMore の変化で observer を作り直すと、
  // タブ切替やデータ更新のたびに観測がリセットされて取りこぼしやちらつきに繋がる。
  // volatile な値は ref 経由で参照し、sentinel ノードのマウント時に 1 度だけ observer を生成する
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const isLoadingMoreRef = useRef(isLoadingMore);
  isLoadingMoreRef.current = isLoadingMore;
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setSentinelRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !isLoadingMoreRef.current
        ) {
          loadMoreRef.current();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

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

  const handlePostReport = useCallback(
    async (
      postId: string,
      reason:
        | "spam"
        | "harassment"
        | "inappropriate"
        | "impersonation"
        | "other",
      detail?: string,
    ) => {
      if (!user?.id) return;
      try {
        await reportPost({ postId, user_id: user.id, reason, detail });
        showToast(t("reportSuccess"), "success");
      } catch {
        showToast(t("reportFailed"), "error");
      }
    },
    [user?.id, showToast, t],
  );

  const handleBlockRequest = useCallback(
    (blockedUserId: string, username: string) => {
      setPendingBlock({ userId: blockedUserId, username });
    },
    [],
  );

  const handleBlockConfirm = useCallback(async () => {
    if (!pendingBlock) return;
    setIsBlocking(true);
    try {
      await blockUser(pendingBlock.userId);
      showToast(t("blockSuccess"), "success");
      setPendingBlock(null);
      refetch();
    } catch {
      showToast(t("blockFailed"), "error");
    } finally {
      setIsBlocking(false);
    }
  }, [pendingBlock, refetch, showToast, t]);

  const emptyKey =
    activeTab === "all"
      ? "emptyAll"
      : activeTab === "training"
        ? "emptyTraining"
        : "emptyFavorites";

  // SocialFeedHeader / 外殻 layout は呼び出し側 (page.tsx + (tabbed) layout) で提供される。
  // ここでは page 中身 (バナー + タブバー + フィード) のみ render する
  return (
    <>
      <div className={styles.desktopPageTitleWrapper}>
        <h2 className={styles.desktopPageTitle}>{t("title")}</h2>
      </div>
      <Link
        href="/social/posts/new"
        className={styles.promoteBanner}
        onClick={() => track("promote_free_users_post_banner_click")}
      >
        <Image
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
          width={1080}
          height={360}
          sizes="(min-width: 581px) 548px, 100vw"
        />
      </Link>
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
        {isRefetchError && posts.length > 0 && (
          <RefetchErrorBanner onRetry={refetch} />
        )}
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
                onReport={handlePostReport}
                onBlock={handleBlockRequest}
              />
            ))}

            <div ref={setSentinelRef} className={styles.sentinel}>
              {isLoadingMore && <Loader size="large" centered />}
              {!hasMore && posts.length > 0 && (
                <p className={styles.noMore}>{t("noMorePosts")}</p>
              )}
            </div>
          </>
        )}
      </div>

      <FloatingActionButton
        onClick={() => {
          if (!canPost) {
            setUpgradeModalKey("premiumModalDailyLimit");
            setShowUpgradeModal(true);
            return;
          }
          if (!hasConfirmedPublicity) {
            setShowPublicityDialog(true);
            return;
          }
          router.push("/social/posts/new");
        }}
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

      <PublicityConfirmDialog
        isOpen={showPublicityDialog}
        onCancel={() => setShowPublicityDialog(false)}
        onConfirm={() => {
          setShowPublicityDialog(false);
          router.push("/social/posts/new");
        }}
      />

      <ConfirmDialog
        isOpen={pendingBlock !== null}
        title={t("blockConfirmTitle")}
        message={t("blockConfirmMessage")}
        confirmLabel={t("menuBlock")}
        cancelLabel={t("editCancel")}
        onConfirm={handleBlockConfirm}
        onCancel={() => setPendingBlock(null)}
        isProcessing={isBlocking}
      />
    </>
  );
}
