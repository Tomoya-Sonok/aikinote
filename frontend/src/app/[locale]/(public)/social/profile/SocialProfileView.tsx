"use client";

import { DotsThreeVerticalIcon, InfoIcon } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProfileCard } from "@/components/features/social/ProfileCard/ProfileCard";
import {
  type ProfileTab,
  ProfileTabBar,
} from "@/components/features/social/ProfileTabBar";
import {
  type SocialFeedPostData,
  SocialPostCard,
} from "@/components/features/social/SocialPostCard/SocialPostCard";
import { Button } from "@/components/shared/Button/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { Loader } from "@/components/shared/Loader/Loader";
import { SocialHeader } from "@/components/shared/layouts/SocialLayout";
import { SignupPromptModal } from "@/components/shared/SignupPromptModal/SignupPromptModal";
import { Tooltip } from "@/components/shared/Tooltip";
import { useToast } from "@/contexts/ToastContext";
import {
  blockUser,
  getPublicSocialProfile,
  getSocialProfile,
  reportPost,
  unblockUser,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSocialFavorite } from "@/lib/hooks/useSocialFavorite";
import { useSwipeNavigation } from "@/lib/hooks/useSwipeNavigation";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";
import { useRouter } from "@/lib/i18n/routing";
import { buildShareUrl } from "@/lib/utils/share";
import styles from "./SocialProfile.module.css";

const PROFILE_TABS: ProfileTab[] = ["posts", "training"];

interface ProfileData {
  is_restricted: boolean;
  user: {
    id: string;
    username: string;
    profile_image_url: string | null;
    full_name: string | null;
    bio: string | null;
    aikido_rank: string | null;
    dojo_style_name: string | null;
  } | null;
  posts: SocialFeedPostData[];
  total_favorites?: number;
  total_posts_count: number;
  total_training_records_count: number;
  public_pages: { id: string; title: string; created_at: string }[];
  is_blocked?: boolean;
  is_blocked_by_target?: boolean;
}

interface SocialProfileViewProps {
  username: string;
}

export function SocialProfileView({ username }: SocialProfileViewProps) {
  const { user: currentUser, isInitializing } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("socialPosts");
  const { showToast } = useToast();
  const { track } = useUmamiTrack();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<SocialFeedPostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { handleToggleFavorite } = useSocialFavorite();

  const isAuthenticated = !!currentUser;
  const isOwnProfile =
    !!profile?.user?.id && profile.user.id === currentUser?.id;

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showMenu]);

  const fetchProfile = useCallback(async () => {
    try {
      const result = currentUser?.id
        ? await getSocialProfile(username)
        : await getPublicSocialProfile(username);
      if (result.success && result.data) {
        const data = result.data as ProfileData;
        setProfile(data);
        setPosts(data.posts);
      }
    } catch (error) {
      console.error("プロフィール取得エラー:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, username]);

  useEffect(() => {
    if (isInitializing) return;
    fetchProfile();
  }, [fetchProfile, isInitializing]);

  const updatePost = useCallback(
    (
      postId: string,
      updater: (post: SocialFeedPostData) => SocialFeedPostData,
    ) => {
      setPosts((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)));
    },
    [],
  );

  const handleSignupPromptOpen = useCallback(() => {
    setShowSignupPrompt(true);
  }, []);

  const handleFavoriteToggle = useCallback(
    (postId: string) => {
      if (!isAuthenticated) {
        handleSignupPromptOpen();
        return;
      }
      handleToggleFavorite(postId, posts, updatePost, () => {
        showToast(t("favoriteDailyLimitReached"), "error");
      });
    },
    [
      handleToggleFavorite,
      posts,
      updatePost,
      showToast,
      t,
      isAuthenticated,
      handleSignupPromptOpen,
    ],
  );

  const handlePostClick = useCallback(
    (postId: string) => {
      if (!isAuthenticated) {
        handleSignupPromptOpen();
        return;
      }
      router.push(`/social/posts/${postId}`);
    },
    [router, isAuthenticated, handleSignupPromptOpen],
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
      if (!currentUser?.id) return;
      try {
        await reportPost({
          postId,
          user_id: currentUser.id,
          reason,
          detail,
        });
        showToast(t("reportSuccess"), "success");
      } catch {
        showToast(t("reportFailed"), "error");
      }
    },
    [currentUser?.id, showToast, t],
  );

  const handleBack = useCallback(() => {
    router.replace("/social/posts");
  }, [router]);

  const handleEdit = useCallback(() => {
    setShowMenu(false);
    track("social_profile_start_edit_profile");
    router.push("/profile/edit?from=social");
  }, [router, track]);

  const handleCopyUrl = useCallback(async () => {
    setShowMenu(false);
    const url = buildShareUrl(`/${locale}/social/profile/${username}`);
    try {
      await navigator.clipboard.writeText(url);
      showToast(t("shareSuccess"), "success");
    } catch (error) {
      console.error("URL コピーエラー:", error);
    }
  }, [locale, username, showToast, t]);

  const handleBlockClick = useCallback(() => {
    setShowMenu(false);
    setShowBlockConfirm(true);
  }, []);

  const handleUnblockClick = useCallback(() => {
    setShowMenu(false);
    setShowUnblockConfirm(true);
  }, []);

  const handleBlockConfirm = useCallback(async () => {
    if (!profile?.user?.id) return;
    setIsBlocking(true);
    try {
      await blockUser(profile.user.id);
      showToast(t("blockSuccess"), "success");
      setShowBlockConfirm(false);
      await fetchProfile();
    } catch {
      showToast(t("blockFailed"), "error");
    } finally {
      setIsBlocking(false);
    }
  }, [profile?.user?.id, fetchProfile, showToast, t]);

  const handleUnblockConfirm = useCallback(async () => {
    if (!profile?.user?.id) return;
    setIsBlocking(true);
    try {
      await unblockUser(profile.user.id);
      showToast(t("unblockSuccess"), "success");
      setShowUnblockConfirm(false);
      await fetchProfile();
    } catch {
      showToast(t("unblockFailed"), "error");
    } finally {
      setIsBlocking(false);
    }
  }, [profile?.user?.id, fetchProfile, showToast, t]);

  // 投稿カードからのブロック (handleBlockRequest と同じ動作だが userId は post 由来)
  const handleCardBlock = useCallback(
    (blockedUserId: string) => {
      if (!profile?.user?.id || profile.user.id !== blockedUserId) {
        // プロフィール本人以外（基本ありえない）は確認なしで即実行
      }
      setShowBlockConfirm(true);
    },
    [profile?.user?.id],
  );

  const regularPosts = useMemo(
    () => posts.filter((p) => p.post_type !== "training_record"),
    [posts],
  );

  const trainingPosts = useMemo(
    () => posts.filter((p) => p.post_type === "training_record"),
    [posts],
  );

  const handleTabChange = useCallback((newTab: string): boolean => {
    setActiveTab(newTab as ProfileTab);
    return true;
  }, []);

  const { containerRef, handlers, swipeProgress, isDragging } =
    useSwipeNavigation({
      tabs: PROFILE_TABS,
      activeTab,
      onTabChange: handleTabChange,
    });

  // SocialLayout は呼び出し側 (page.tsx) でラップ済み。
  // ここで再度ラップすると DOM が二重になり PPR の static shell 効果も弱まる。
  if (isLoading || isInitializing) {
    return <Loader centered size="large" />;
  }

  if (!profile) {
    return (
      <>
        <SocialHeader
          title={t("profileTitle")}
          onBack={isAuthenticated ? handleBack : undefined}
          backLabel={t("back")}
        />
        <div className={styles.empty}>
          <p>{t("profileNotFound")}</p>
        </div>
        <SignupPromptModal
          isOpen={showSignupPrompt}
          onClose={() => setShowSignupPrompt(false)}
        />
      </>
    );
  }

  if (profile.is_restricted) {
    return (
      <>
        <SocialHeader
          title={t("profileTitle")}
          onBack={isAuthenticated ? handleBack : undefined}
          backLabel={t("back")}
        />
        <div className={styles.empty}>
          <p>{t("profileRestricted")}</p>
        </div>
        <SignupPromptModal
          isOpen={showSignupPrompt}
          onClose={() => setShowSignupPrompt(false)}
        />
      </>
    );
  }

  const profileUser = profile.user;
  if (!profileUser) {
    return (
      <>
        <SocialHeader
          title={t("profileTitle")}
          onBack={isAuthenticated ? handleBack : undefined}
          backLabel={t("back")}
        />
        <div className={styles.empty}>
          <p>{t("profileNotFound")}</p>
        </div>
        <SignupPromptModal
          isOpen={showSignupPrompt}
          onClose={() => setShowSignupPrompt(false)}
        />
      </>
    );
  }

  return (
    <>
      <SocialHeader
        title={t("profileTitle")}
        onBack={isAuthenticated ? handleBack : undefined}
        backLabel={t("back")}
        right={
          <div className={styles.headerRight} ref={menuRef}>
            <Button
              className={styles.iconButton}
              onClick={() => setShowMenu((prev) => !prev)}
              aria-label="メニュー"
            >
              <DotsThreeVerticalIcon size={24} weight="bold" />
            </Button>
            {showMenu && (
              <div className={styles.menuDropdown}>
                {isOwnProfile && (
                  <button
                    type="button"
                    className={styles.menuItem}
                    onClick={handleEdit}
                  >
                    {t("profileEditButton")}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.menuItem}
                  onClick={handleCopyUrl}
                >
                  {t("profileMenuCopyUrl")}
                </button>
                {!isOwnProfile &&
                  isAuthenticated &&
                  (profile?.is_blocked ? (
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={handleUnblockClick}
                    >
                      {t("menuUnblock")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={handleBlockClick}
                    >
                      {t("menuBlock")}
                    </button>
                  ))}
              </div>
            )}
          </div>
        }
      />

      <ProfileCard
        profileImageUrl={profileUser.profile_image_url}
        fullName={profileUser.full_name}
        username={profileUser.username}
        dojoStyleName={profileUser.dojo_style_name}
        aikidoRank={profileUser.aikido_rank}
        bio={profileUser.bio}
      />

      <div className={styles.statsSection}>
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {profile.total_posts_count}
            </span>
            <span className={styles.statLabel}>{t("userPosts")}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {profile.total_training_records_count}
            </span>
            <span className={styles.statLabel}>{t("trainingRecords")}</span>
          </div>
          <div className={styles.statItem}>
            {isOwnProfile ? (
              <span className={styles.statValue}>
                {profile.total_favorites ?? 0}
              </span>
            ) : (
              <Tooltip
                text={t("otherUserFavoritesHidden")}
                position="bottom"
                className={styles.statValueWithInfo}
                ariaLabel={t("otherUserFavoritesHidden")}
              >
                ???
                <InfoIcon size={14} weight="regular" />
              </Tooltip>
            )}
            <span className={styles.statLabel}>{t("totalFavorites")}</span>
          </div>
        </div>
      </div>

      {/* タブ切り替え（横スワイプ対応） */}
      <ProfileTabBar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        swipeProgress={isDragging ? swipeProgress : 0}
      />

      {/* タブコンテンツ（containerRef + handlers でスワイプ検知） */}
      <div
        ref={containerRef}
        className={`${styles.postsSection} ${isDragging ? styles.postsSectionSwiping : ""}`}
        {...handlers}
      >
        {!isOwnProfile && profile?.is_blocked && (
          <p className={styles.emptyPosts}>{t("blockedProfileMessage")}</p>
        )}
        {!isOwnProfile &&
          !profile?.is_blocked &&
          profile?.is_blocked_by_target && (
            <p className={styles.emptyPosts}>{t("blockedByTargetMessage")}</p>
          )}
        {activeTab === "posts" &&
          !profile?.is_blocked &&
          !profile?.is_blocked_by_target &&
          (regularPosts.length === 0 ? (
            <p className={styles.emptyPosts}>{t("emptyAll")}</p>
          ) : (
            regularPosts.map((post) => (
              <SocialPostCard
                key={post.id}
                post={post}
                currentUserId={currentUser?.id ?? ""}
                onFavoriteToggle={handleFavoriteToggle}
                onClick={handlePostClick}
                onReport={handlePostReport}
                onBlock={isAuthenticated ? handleCardBlock : undefined}
              />
            ))
          ))}

        {activeTab === "training" &&
          !profile?.is_blocked &&
          !profile?.is_blocked_by_target &&
          (trainingPosts.length === 0 ? (
            <p className={styles.emptyPosts}>{t("emptyTrainingRecords")}</p>
          ) : (
            trainingPosts.map((post) => (
              <SocialPostCard
                key={post.id}
                post={post}
                currentUserId={currentUser?.id ?? ""}
                onFavoriteToggle={handleFavoriteToggle}
                onClick={handlePostClick}
                onReport={handlePostReport}
                onBlock={isAuthenticated ? handleCardBlock : undefined}
              />
            ))
          ))}
      </div>

      <SignupPromptModal
        isOpen={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
      />

      <ConfirmDialog
        isOpen={showBlockConfirm}
        title={t("blockConfirmTitle")}
        message={t("blockConfirmMessage")}
        confirmLabel={t("menuBlock")}
        cancelLabel={t("editCancel")}
        onConfirm={handleBlockConfirm}
        onCancel={() => setShowBlockConfirm(false)}
        isProcessing={isBlocking}
      />

      <ConfirmDialog
        isOpen={showUnblockConfirm}
        title={t("unblockConfirmTitle")}
        message={t("unblockConfirmMessage")}
        confirmLabel={t("menuUnblock")}
        cancelLabel={t("editCancel")}
        onConfirm={handleUnblockConfirm}
        onCancel={() => setShowUnblockConfirm(false)}
        isProcessing={isBlocking}
      />
    </>
  );
}
