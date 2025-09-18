import type { FC } from "react";
import { SettingItem } from "@/components/atoms/SettingItem/SettingItem";
import styles from "./SettingsMenu.module.css";

interface SettingsMenuProps {
  onPublicityClick: () => void;
  onEmailClick: () => void;
  onTextSizeClick: () => void;
  onLanguageClick: () => void;
  className?: string;
}

export const SettingsMenu: FC<SettingsMenuProps> = ({
  onPublicityClick,
  onEmailClick,
  onTextSizeClick,
  onLanguageClick,
  className = "",
}) => {
  return (
    <div className={`${styles.menu} ${className}`}>
      <SettingItem onClick={onPublicityClick}>公開範囲</SettingItem>
      <SettingItem onClick={onEmailClick}>メール</SettingItem>
      <SettingItem onClick={onTextSizeClick}>文字サイズ</SettingItem>
      <SettingItem onClick={onLanguageClick}>言語 / Language</SettingItem>
    </div>
  );
};
