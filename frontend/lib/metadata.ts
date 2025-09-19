import type { Metadata } from "next";

export type MetadataOptions = {
	title?: string;
	description?: string;
	isIndexing?: boolean;
	keywords?: string[];
	openGraphTitle?: string;
	openGraphDescription?: string;
};

export function buildMetadata({
	title,
	description,
	isIndexing = false, // デフォルトはnoindex
	keywords,
	openGraphTitle,
	openGraphDescription,
}: MetadataOptions): Metadata {
	const robots = isIndexing
		? undefined
		: ({
				index: false,
				follow: false,
				googleBot: {
					index: false,
					follow: false,
				},
			} satisfies Metadata["robots"]);

	const openGraph =
		openGraphTitle || openGraphDescription
			? {
					title: openGraphTitle ?? title ?? undefined,
					description: openGraphDescription ?? description ?? undefined,
				}
			: undefined;

	return {
		title,
		description,
		keywords,
		robots,
		openGraph,
	};
}
