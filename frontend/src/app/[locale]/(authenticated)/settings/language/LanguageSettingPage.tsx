"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import { LanguageSetting } from "@/components/molecules/LanguageSetting/LanguageSetting";
import { useToast } from "@/contexts/ToastContext";
import { useLanguageStore } from "@/stores/languageStore";

interface LanguageSettingPageProps {
  locale: string;
}

export function LanguageSettingPage({ locale }: LanguageSettingPageProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { getNavigationPath } = useLanguageStore();
  const t = useTranslations();

  const handleSave = () => {
    showToast(t("language.saved"), "success");
    setTimeout(() => {
      const targetPath = getNavigationPath("/personal/pages");
      router.push(targetPath);
    }, 800);
  };

  return (
    <MinimalLayout
      headerTitle={t("language.title")}
      backHref={`/${locale}/personal/pages`}
    >
      <LanguageSetting onSave={handleSave} />
    </MinimalLayout>
  );
}
