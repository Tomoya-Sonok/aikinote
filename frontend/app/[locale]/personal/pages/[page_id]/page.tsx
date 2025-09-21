import { DefaultLayout } from "@/components/layouts/DefaultLayout";
import { buildMetadata } from "@/lib/metadata";
import { PageDetailPageClient } from "./PageDetailPageClient";

export const metadata = buildMetadata({
	title: "稽古ページ詳細",
	description: "稽古ページの詳細を確認できます。",
});

export default function PageDetailPage() {
	return (
		<DefaultLayout>
			<PageDetailPageClient />
		</DefaultLayout>
	);
}
