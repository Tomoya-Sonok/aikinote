"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FontSizeSetting as FontSizeSettingFeature } from "@/components/features/setting/FontSizeSetting/FontSizeSetting";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";

interface FontSizeSettingProps {
  locale: string;
}

export function FontSizeSetting({ locale }: FontSizeSettingProps) {
  const router = useRouter();
  const t = useTranslations();

  const handleSave = () => {
    router.push(`/${locale}/personal/pages`);
  };

  return (
    <MinimalLayout
      headerTitle={t("fontSize.title")}
      backHref={`/${locale}/personal/pages`}
    >
      <FontSizeSettingFeature onSave={handleSave} />
    </MinimalLayout>
  );
}
