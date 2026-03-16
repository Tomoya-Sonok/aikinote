"use client";

import { InfoIcon } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ProfileCard } from "@/components/features/social/ProfileCard/ProfileCard";
import { Button } from "@/components/shared/Button/Button";
import { Loader } from "@/components/shared/Loader/Loader";
import {
  SocialHeader,
  SocialLayout,
} from "@/components/shared/layouts/SocialLayout";
import { Tooltip } from "@/components/shared/Tooltip";
import { getSocialProfile } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
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
  posts: {
    id: string;
    content: string;
    post_type: string;
    created_at: string;
  }[];
  total_favorites?: number;
  total_pages: number;
  public_pages: { id: string; title: string; created_at: string }[];
}

interface SocialProfileViewProps {
  userId: string;
}

export function SocialProfileView({ userId }: SocialProfileViewProps) {
  const { user: currentUser } = useAuth();
  const locale = useLocale();
  const t = useTranslations("socialPosts");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchProfile = async () => {
      try {
        const result = await getSocialProfile(userId);
        if (result.success && result.data) {
          setProfile(result.data as ProfileData);
        }
      } catch (error) {
        console.error("プロフィール取得エラー:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser?.id, userId]);

  const handleBack = useCallback(() => {
    window.location.href = `/${locale}/social/posts`;
  }, [locale]);

  const handleEdit = useCallback(() => {
    window.location.href = `/${locale}/profile/edit?from=social`;
  }, [locale]);

  if (isLoading) {
    return (
      <SocialLayout>
        <Loader centered size="medium" />
      </SocialLayout>
    );
  }

  if (!profile) {
    return (
      <SocialLayout>
        <SocialHeader
          title={t("profileTitle")}
          onBack={handleBack}
          backLabel={t("back")}
        />
        <div className={styles.empty}>
          <p>{t("profileNotFound")}</p>
        </div>
      </SocialLayout>
    );
  }

  if (profile.is_restricted) {
    return (
      <SocialLayout>
        <SocialHeader
          title={t("profileTitle")}
          onBack={handleBack}
          backLabel={t("back")}
        />
        <div className={styles.empty}>
          <p>{t("profileRestricted")}</p>
        </div>
      </SocialLayout>
    );
  }

  const profileUser = profile.user;
  if (!profileUser) {
    return (
      <SocialLayout>
        <SocialHeader
          title={t("profileTitle")}
          onBack={handleBack}
          backLabel={t("back")}
        />
        <div className={styles.empty}>
          <p>{t("profileNotFound")}</p>
        </div>
      </SocialLayout>
    );
  }

  return (
    <SocialLayout>
      <SocialHeader
        title={t("profileTitle")}
        onBack={handleBack}
        backLabel={t("back")}
        right={
          isOwnProfile ? (
            <Button variant="primary" size="small" onClick={handleEdit}>
              {t("profileEditButton")}
            </Button>
          ) : undefined
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
              <span className={styles.statValueWithInfo}>
                ???
                <Tooltip text={t("otherUserFavoritesHidden")} position="bottom">
                  <InfoIcon size={14} weight="regular" />
                </Tooltip>
              </span>
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
        {activeTab === "posts" && (
          <>
            {profile.posts.length === 0 ? (
              <p className={styles.emptyPosts}>{t("emptyAll")}</p>
            ) : (
              profile.posts.map((post) => (
                <a
                  key={post.id}
                  href={`/${locale}/social/posts/${post.id}`}
                  className={styles.postLink}
                >
                  <p className={styles.postContent}>{post.content}</p>
                  <span className={styles.postDate}>
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </a>
              ))
            )}
          </>
        )}

        {activeTab === "training" && (
          <>
            {profile.public_pages.length === 0 ? (
              <p className={styles.emptyPosts}>{t("emptyTrainingRecords")}</p>
            ) : (
              profile.public_pages.map((page) => (
                <div key={page.id} className={styles.postLink}>
                  <p className={styles.postContent}>{page.title}</p>
                  <span className={styles.postDate}>
                    {new Date(page.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </SocialLayout>
  );
}
