import { useTranslations } from "next-intl";
import type { FC } from "react";
import { SettingItem } from "@/components/shared/SettingItem/SettingItem";
import styles from "./OtherMenu.module.css";

interface OtherMenuProps {
  onHelpClick: () => void;
  onLogoutClick: () => void;
  className?: string;
}

export const OtherMenu: FC<OtherMenuProps> = ({
  onHelpClick,
  onLogoutClick,
  className = "",
}) => {
  const t = useTranslations();
  return (
    <div className={`${styles.menu} ${className}`}>
      <SettingItem onClick={onHelpClick}>
        {t("components.helpContact")}
      </SettingItem>
      <SettingItem onClick={onLogoutClick} variant="danger">
        {t("components.logout")}
      </SettingItem>
    </div>
  );
};
