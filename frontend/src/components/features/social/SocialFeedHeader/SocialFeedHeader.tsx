"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import type { FC } from "react";
import { SocialHeader } from "@/components/shared/layouts/SocialLayout";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import styles from "./SocialFeedHeader.module.css";

interface SocialFeedHeaderProps {
  profileImageUrl?: string | null;
}

export const SocialFeedHeader: FC<SocialFeedHeaderProps> = ({
  profileImageUrl,
}) => {
  const t = useTranslations("socialPosts");
  const locale = useLocale();

  return (
    <SocialHeader>
      <a
        href={`/${locale}/social/profile`}
        className={styles.profileLink}
        aria-label={t("profile")}
      >
        <ProfileImage src={profileImageUrl} size="small" />
      </a>
      <h1 className={styles.title}>{t("title")}</h1>
      <a
        href={`/${locale}/social/posts/search`}
        className={styles.searchLink}
        aria-label={t("search")}
      >
        <MagnifyingGlassIcon size={24} weight="regular" />
      </a>
    </SocialHeader>
  );
};
