"use client";

import { DotsThreeVerticalIcon, InfoIcon } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProfileCard } from "@/components/features/social/ProfileCard/ProfileCard";
import {
  type SocialFeedPostData,
  SocialPostCard,
} from "@/components/features/social/SocialPostCard/SocialPostCard";
import { Button } from "@/components/shared/Button/Button";
import { Loader } from "@/components/shared/Loader/Loader";
import {
  SocialHeader,
  SocialLayout,
} from "@/components/shared/layouts/SocialLayout";
import { SignupPromptModal } from "@/components/shared/SignupPromptModal/SignupPromptModal";
import { Tooltip } from "@/components/shared/Tooltip";
import { useToast } from "@/contexts/ToastContext";
import { getPublicSocialProfile, getSocialProfile } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSocialFavorite } from "@/lib/hooks/useSocialFavorite";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";
import { useRouter } from "@/lib/i18n/routing";
import { buildShareUrl } from "@/lib/utils/share";
import styles from "./SocialProfile.module.css";

type ProfileTab = "posts" | "training";

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
  total_pages: number;
  public_pages: { id: string; title: string; created_at: string }[];
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

  useEffect(() => {
    if (isInitializing) return;
    const fetchProfile = async () => {
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
    };
    fetchProfile();
  }, [currentUser?.id, username, isInitializing]);

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

  const regularPosts = useMemo(
    () => posts.filter((p) => p.post_type !== "training_record"),
    [posts],
  );

  const trainingPosts = useMemo(
    () => posts.filter((p) => p.post_type === "training_record"),
    [posts],
  );

  if (isLoading || isInitializing) {
    return (
      <SocialLayout showTabNavigation={false}>
        <Loader centered size="large" />
      </SocialLayout>
    );
  }

  if (!profile) {
    return (
      <SocialLayout showTabNavigation={false}>
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
      </SocialLayout>
    );
  }

  if (profile.is_restricted) {
    return (
      <SocialLayout showTabNavigation={false}>
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
      </SocialLayout>
    );
  }

  const profileUser = profile.user;
  if (!profileUser) {
    return (
      <SocialLayout showTabNavigation={false}>
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
      </SocialLayout>
    );
  }

  return (
    <SocialLayout showTabNavigation={false}>
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
            <span className={styles.statValue}>{profile.posts.length}</span>
            <span className={styles.statLabel}>{t("userPosts")}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{profile.total_pages}</span>
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

      {/* タブ切り替え */}
      <div className={styles.tabBar} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "posts"}
          className={`${styles.tab} ${activeTab === "posts" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("posts")}
        >
          {t("profileTabPosts")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "training"}
          className={`${styles.tab} ${activeTab === "training" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("training")}
        >
          {t("profileTabTraining")}
        </button>
      </div>

      {/* タブコンテンツ */}
      <div className={styles.postsSection}>
        {activeTab === "posts" &&
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
              />
            ))
          ))}

        {activeTab === "training" &&
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
              />
            ))
          ))}
      </div>

      <SignupPromptModal
        isOpen={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
      />
    </SocialLayout>
  );
}
