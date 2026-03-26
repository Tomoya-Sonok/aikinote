import type { Metadata } from "next";

export type MetadataOptions = {
  title?: string;
  titleAbsolute?: string;
  description?: string;
  isIndexing?: boolean;
  keywords?: string[];
  openGraphTitle?: string;
  openGraphDescription?: string;
  canonical?: string;
  alternateLanguages?: Record<string, string>;
};

export function buildMetadata({
  title,
  titleAbsolute,
  description,
  isIndexing = false, // デフォルトはnoindex
  keywords,
  openGraphTitle,
  openGraphDescription,
  canonical,
  alternateLanguages,
}: MetadataOptions): Metadata {
  const titleValue = titleAbsolute ? { absolute: titleAbsolute } : title;

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
          title: openGraphTitle ?? titleAbsolute ?? title ?? undefined,
          description: openGraphDescription ?? description ?? undefined,
        }
      : undefined;

  const alternates = canonical
    ? {
        canonical,
        ...(alternateLanguages ? { languages: alternateLanguages } : {}),
      }
    : undefined;

  return {
    title: titleValue,
    description,
    keywords,
    robots,
    openGraph,
    alternates,
  };
}
