"use client";

import { useLocale, useTranslations } from "next-intl";
import type { FC } from "react";
import { useState } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { useLanguageStore, type Language, getLanguageOptions } from "@/stores/languageStore";
import styles from "./LanguageSetting.module.css";


interface LanguageSettingProps {
  onSave?: () => void;
  className?: string;
}


export const LanguageSetting: FC<LanguageSettingProps> = ({ onSave }) => {
  const currentLocale = useLocale() as Language;
  const { language, setLanguage } = useLanguageStore();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(currentLocale);
  const t = useTranslations();

  const languageOptions = getLanguageOptions();

  const handleLanguageChange = (targetLanguage: Language) => {
    setSelectedLanguage(targetLanguage);
  };

  const handleSave = () => {
    // zustandストアを更新
    setLanguage(selectedLanguage);
    onSave?.();
  };

  return (
    <div className={styles.container}>
      <div className={styles.settingArea}>
        {/* 言語選択 */}
        <div className={styles.languageOptions}>
          {languageOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.languageOption} ${
                selectedLanguage === option.value ? styles.languageOptionActive : ""
              }`}
              onClick={() => handleLanguageChange(option.value)}
            >
              <span className={styles.languageLabel}>{option.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.actions}>
          <Button variant="primary" onClick={handleSave}>
            {t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
};
