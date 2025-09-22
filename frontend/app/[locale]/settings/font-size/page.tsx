"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import { FontSizeSetting } from "@/components/molecules/FontSizeSetting/FontSizeSetting";
import { useToast } from "@/contexts/ToastContext";

export default function FontSizeSettingPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const t = useTranslations();

  const handleSave = () => {
    showToast(t("fontSize.saved"), "success");
    // 少し待ってからホームページに戻る
    setTimeout(() => {
      router.push("/");
    }, 800);
  };

  return (
    <MinimalLayout headerTitle={t("fontSize.title")} backHref="/">
      <FontSizeSetting onSave={handleSave} />
    </MinimalLayout>
  );
}
