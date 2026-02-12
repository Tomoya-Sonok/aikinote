"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import { FontSizeSetting } from "@/components/molecules/FontSizeSetting/FontSizeSetting";
import { useToast } from "@/contexts/ToastContext";

interface FontSizeSettingPageProps {
  locale: string;
}

export function FontSizeSettingPage({ locale }: FontSizeSettingPageProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const t = useTranslations();

  const handleSave = () => {
    showToast(t("fontSize.saved"), "success");
    setTimeout(() => {
      router.push(`/${locale}/personal/pages`);
    }, 800);
  };

  return (
    <MinimalLayout
      headerTitle={t("fontSize.title")}
      backHref={`/${locale}/personal/pages`}
    >
      <FontSizeSetting onSave={handleSave} />
    </MinimalLayout>
  );
}
