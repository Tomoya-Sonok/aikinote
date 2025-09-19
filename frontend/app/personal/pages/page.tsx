import { DefaultLayout } from "@/components/layouts/DefaultLayout";
import { buildMetadata } from "@/lib/metadata";
import { PersonalPagesPageClient } from "./PersonalPagesPageClient";

export const metadata = buildMetadata({
	title: "稽古ページ一覧",
	description: "個人で作成した稽古ページを一覧で管理できます。",
});

export default function PersonalPagesPage() {
	return (
		<DefaultLayout>
			<PersonalPagesPageClient />
		</DefaultLayout>
	);
}
