"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { FC } from "react";
import { OtherMenu } from "@/components/features/setting/OtherMenu/OtherMenu";
import { SettingsMenu } from "@/components/features/setting/SettingsMenu/SettingsMenu";
import { UserInfoCard } from "@/components/features/user-info/UserInfoCard/UserInfoCard";
import { UserInfoCardSkeleton } from "@/components/features/user-info/UserInfoCard/UserInfoCardSkeleton";
import { MenuSection } from "@/components/shared/MenuSection/MenuSection";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./MyPageContent.module.css";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  profile_image_url?: string | null;
  full_name?: string | null;
  dojo_style_name?: string | null;
  dojo_style_id?: string | null;
  training_start_date?: string | null;
  publicity_setting?: string | null;
  aikido_rank?: string | null;
  bio?: string | null;
  age_range?: string | null;
  gender?: string | null;
  language?: string;
  is_email_verified?: boolean;
  password_hash?: string;
}

interface MyPageContentProps {
  user: UserProfile;
  loading?: boolean;
  className?: string;
}

export const MyPageContent: FC<MyPageContentProps> = ({
  user,
  loading = false,
  className = "",
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { signOutUser } = useAuth();

  const handleEditUserInfo = () => {
    router.push(`/${locale}/profile/edit`);
  };

  const handleLogout = async () => {
    await signOutUser();
  };

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
        {loading ? (
          <UserInfoCardSkeleton />
        ) : (
          <UserInfoCard
            username={user.username}
            fullName={user.full_name}
            dojoStyleName={user.dojo_style_name}
            aikidoRank={user.aikido_rank}
            bio={user.bio}
            profileImageUrl={user.profile_image_url}
            onEditClick={handleEditUserInfo}
          />
        )}
      </MenuSection>

      <MenuSection title={t("mypageContent.settingsSection")}>
        <SettingsMenu />
      </MenuSection>

      <MenuSection title={t("mypageContent.otherSection")}>
        <OtherMenu onHelpClick={handleHelpClick} onLogoutClick={handleLogout} />
      </MenuSection>
    </div>
  );
};
