import type { FC } from "react";
import { SettingItem } from "@/components/atoms/SettingItem/SettingItem";
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
  return (
    <div className={`${styles.menu} ${className}`}>
      <SettingItem onClick={onHelpClick}>ヘルプ・問い合わせ</SettingItem>
      <SettingItem onClick={onLogoutClick} variant="danger">
        ログアウト
      </SettingItem>
    </div>
  );
};
