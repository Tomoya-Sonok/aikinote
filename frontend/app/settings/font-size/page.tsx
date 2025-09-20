"use client";

import { useRouter } from "next/navigation";
import { FontSizeSetting } from "@/components/molecules/FontSizeSetting/FontSizeSetting";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import { useToast } from "@/contexts/ToastContext";

export default function FontSizeSettingPage() {
	const router = useRouter();
	const { showToast } = useToast();

	const handleSave = () => {
		showToast("文字サイズ設定を保存しました", "success");
		// 少し待ってからマイページに戻る
		setTimeout(() => {
			router.push("/mypage");
		}, 800);
	};

	return (
		<MinimalLayout headerTitle="文字サイズ設定" backHref="/mypage">
			<FontSizeSetting onSave={handleSave} />
		</MinimalLayout>
	);
}
