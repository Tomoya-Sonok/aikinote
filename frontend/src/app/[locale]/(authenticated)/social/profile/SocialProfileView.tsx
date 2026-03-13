"use client";

import { InfoIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/shared/Button/Button";
import { Loader } from "@/components/shared/Loader/Loader";
import {
  SocialHeader,
  SocialLayout,
} from "@/components/shared/layouts/SocialLayout";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import { Tooltip } from "@/components/shared/Tooltip";
import { getSocialProfile } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./SocialProfile.module.css";

interface ProfileData {
  is_restricted: boolean;
  user: {
    id: string;
    username: string;
    profile_image_url: string | null;
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
    window.location.href = `/${locale}/social/profile/edit`;
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

  // 非公開プロフィール
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
      />

      <div className={styles.profileCard}>
        <ProfileImage src={profileUser.profile_image_url} size="large" />
        <h2 className={styles.username}>{profileUser.username}</h2>

        {profileUser.aikido_rank && (
          <span className={styles.rank}>{profileUser.aikido_rank}</span>
        )}
        {profileUser.dojo_style_name && (
          <span className={styles.dojo}>{profileUser.dojo_style_name}</span>
        )}
        {profileUser.bio && <p className={styles.bio}>{profileUser.bio}</p>}

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{profile.posts.length}</span>
            <span className={styles.statLabel}>{t("userPosts")}</span>
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

        {isOwnProfile && (
          <Button variant="secondary" size="small" onClick={handleEdit}>
            <PencilSimpleIcon size={16} weight="regular" />
            {t("profileEdit")}
          </Button>
        )}
      </div>

      <div className={styles.postsSection}>
        <h3 className={styles.sectionTitle}>{t("userPosts")}</h3>
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
      </div>
    </SocialLayout>
  );
}
