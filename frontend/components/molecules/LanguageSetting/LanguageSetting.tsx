"use client";

import { useLocale, useTranslations } from "next-intl";
import type { FC } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { usePathname, useRouter } from "@/lib/i18n/routing";
import styles from "./LanguageSetting.module.css";

type Language = "ja" | "en";

interface LanguageSettingProps {
  onSave?: () => void;
  className?: string;
}

const getLanguageOptions = (): Array<{ value: Language; label: string }> => {
  return [
    { value: "ja", label: "日本語" },
    { value: "en", label: "English" },
  ];
};

export const LanguageSetting: FC<LanguageSettingProps> = ({ onSave }) => {
  const locale = useLocale() as Language;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();

  const languageOptions = getLanguageOptions();

  const handleLanguageChange = (targetLanguage: Language) => {
    router.push(pathname, { locale: targetLanguage });
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
                locale === option.value ? styles.languageOptionActive : ""
              }`}
              onClick={() => handleLanguageChange(option.value)}
            >
              <span className={styles.languageLabel}>{option.label}</span>
            </button>
          ))}
        </div>

        {onSave && (
          <div className={styles.actions}>
            <Button variant="primary" onClick={onSave}>
              {t("common.save")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
