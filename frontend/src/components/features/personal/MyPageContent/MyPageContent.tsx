"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { FC } from "react";
import { ProfileCard } from "@/components/features/profile/ProfileCard/ProfileCard";
import { OtherMenu } from "@/components/features/setting/OtherMenu/OtherMenu";
import { SettingsMenu } from "@/components/features/setting/SettingsMenu/SettingsMenu";
import { MenuSection } from "@/components/shared/MenuSection/MenuSection";
import styles from "./MyPageContent.module.css";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  profile_image_url?: string | null;
  dojo_style_name?: string | null;
  training_start_date?: string | null;
  publicity_setting?: string;
  language?: string;
  is_email_verified?: boolean;
  password_hash?: string;
}

interface MyPageContentProps {
  user: UserProfile;
  className?: string;
}

export const MyPageContent: FC<MyPageContentProps> = ({
  user,
  className = "",
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const handleEditProfile = () => {
    router.push(`/${locale}/profile/edit`);
  };

  const handleLogout = async () => {
    router.push(`/${locale}/logout`);
  };

  const handlePublicityClick = () => {};

  const handleHelpClick = () => {
    window.open(
      "https://docs.google.com/forms/d/e/1FAIpQLSfr11mzmwzwwXXULuoT4w8D57e9aAtUZa_9i8HDGAtDgjNxYw/viewform?usp=dialog",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className={`${styles.content} ${className}`}>
      <MenuSection title={t("mypageContent.profileSection")}>
        <ProfileCard
          username={user.username}
          dojoStyleName={user.dojo_style_name || t("mypageContent.notEntered")}
          trainingStartDate={
            user.training_start_date || t("mypageContent.notEntered")
          }
          profileImageUrl={user.profile_image_url}
          onEditClick={handleEditProfile}
        />
      </MenuSection>

      <MenuSection title={t("mypageContent.settingsSection")}>
        <SettingsMenu onPublicityClick={handlePublicityClick} />
      </MenuSection>

      <MenuSection title={t("mypageContent.otherSection")}>
        <OtherMenu onHelpClick={handleHelpClick} onLogoutClick={handleLogout} />
      </MenuSection>
    </div>
  );
};
