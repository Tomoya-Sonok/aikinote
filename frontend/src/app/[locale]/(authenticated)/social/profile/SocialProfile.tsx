"use client";

import { PencilSimpleIcon } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/shared/Button/Button";
import { Loader } from "@/components/shared/Loader/Loader";
import {
  SocialHeader,
  SocialLayout,
} from "@/components/shared/layouts/SocialLayout";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import { getSocialProfile } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./SocialProfile.module.css";

interface ProfileData {
  user: {
    id: string;
    username: string;
    profile_image_url: string | null;
    bio: string | null;
    aikido_rank: string | null;
    dojo_style_name: string | null;
  };
  posts: {
    id: string;
    content: string;
    post_type: string;
    created_at: string;
  }[];
  total_favorites?: number;
}

export function SocialProfile() {
  const { user } = useAuth();
  const locale = useLocale();
  const t = useTranslations("socialPosts");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchProfile = async () => {
      try {
        const result = await getSocialProfile(user.id);
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
  }, [user?.id]);

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
        <div className={styles.empty}>
          <p>プロフィールが見つかりませんでした</p>
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
        <ProfileImage src={profile.user.profile_image_url} size="large" />
        <h2 className={styles.username}>{profile.user.username}</h2>

        {profile.user.aikido_rank && (
          <span className={styles.rank}>{profile.user.aikido_rank}</span>
        )}
        {profile.user.dojo_style_name && (
          <span className={styles.dojo}>{profile.user.dojo_style_name}</span>
        )}
        {profile.user.bio && <p className={styles.bio}>{profile.user.bio}</p>}

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{profile.posts.length}</span>
            <span className={styles.statLabel}>{t("myPosts")}</span>
          </div>
          {profile.total_favorites !== undefined && (
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {profile.total_favorites}
              </span>
              <span className={styles.statLabel}>{t("totalFavorites")}</span>
            </div>
          )}
        </div>

        <Button variant="secondary" size="small" onClick={handleEdit}>
          <PencilSimpleIcon size={16} weight="regular" />
          {t("profileEdit")}
        </Button>
      </div>

      <div className={styles.postsSection}>
        <h3 className={styles.sectionTitle}>{t("myPosts")}</h3>
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
