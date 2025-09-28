"use client";

import { useLocale, useTranslations } from "next-intl";
import type { FC } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MenuSection } from "@/components/atoms/MenuSection/MenuSection";
import { OtherMenu } from "@/components/molecules/OtherMenu/OtherMenu";
import { ProfileCard } from "@/components/molecules/ProfileCard/ProfileCard";
import { SettingsMenu } from "@/components/molecules/SettingsMenu/SettingsMenu";
import { useAuth } from "@/lib/hooks/useAuth";
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
  const { signOutUser } = useAuth();
  const [currentUser, setCurrentUser] = useState(user);

  const handleEditProfile = () => {
    router.push(`/${locale}/profile/edit`);
  };

  const handleLogout = async () => {
    try {
      console.log("ログアウト処理を開始します");
      await signOutUser();
      console.log("ログアウト処理完了");
    } catch (error) {
      console.error("ログアウトエラー:", error);
      // エラーが発生した場合もユーザーに分かるようにアラートを表示
      alert(t("mypageContent.logoutFailed"));
    }
  };

  const handleSettingClick = (settingType: string) => {
    console.log(`${settingType}がクリックされました`);
  };

  return (
    <div className={`${styles.content} ${className}`}>
      <MenuSection title={t("mypageContent.profileSection")}>
        <ProfileCard
          username={currentUser.username}
          dojoStyleName={
            currentUser.dojo_style_name || t("mypageContent.notEntered")
          }
          trainingStartDate={
            currentUser.training_start_date || t("mypageContent.notEntered")
          }
          profileImageUrl={currentUser.profile_image_url}
          onEditClick={handleEditProfile}
        />
      </MenuSection>

      <MenuSection title={t("mypageContent.settingsSection")}>
        <SettingsMenu
          onPublicityClick={() => handleSettingClick("公開範囲")}
          onEmailClick={() => handleSettingClick("メール")}
          onTextSizeClick={() => handleSettingClick("文字サイズ")}
          onLanguageClick={() => handleSettingClick("言語")}
        />
      </MenuSection>

      <MenuSection title={t("mypageContent.otherSection")}>
        <OtherMenu
          onHelpClick={() => handleSettingClick("ヘルプ")}
          onLogoutClick={handleLogout}
        />
      </MenuSection>
    </div>
  );
};
