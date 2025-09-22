"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import { LanguageSetting } from "@/components/molecules/LanguageSetting/LanguageSetting";
import { useToast } from "@/contexts/ToastContext";

export default function LanguageSettingPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const t = useTranslations();

  const handleSave = () => {
    showToast(t("language.saved"), "success");
    // 少し待ってからホームページに戻る
    setTimeout(() => {
      router.push("/");
    }, 800);
  };

  return (
    <MinimalLayout headerTitle={t("language.title")} backHref="/">
      <LanguageSetting onSave={handleSave} />
    </MinimalLayout>
  );
}
