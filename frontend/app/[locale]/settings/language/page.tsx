"use client";

import { useRouter } from "next/navigation";
import { LanguageSetting } from "@/components/molecules/LanguageSetting/LanguageSetting";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import { useToast } from "@/contexts/ToastContext";
import { useTranslations } from "next-intl";

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