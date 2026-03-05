"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSetting as LanguageSettingFeature } from "@/components/features/setting/LanguageSetting/LanguageSetting";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { useToast } from "@/contexts/ToastContext";
import { useLanguageStore } from "@/stores/languageStore";

interface LanguageSettingProps {
  locale: string;
}

export function LanguageSetting({ locale }: LanguageSettingProps) {
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
      <LanguageSettingFeature onSave={handleSave} />
    </MinimalLayout>
  );
}
