import type { Metadata } from "next";

export type MetadataOptions = {
  title?: string;
  titleAbsolute?: string;
  description?: string;
  isIndexing?: boolean;
  keywords?: string[];
  openGraphTitle?: string;
  openGraphDescription?: string;
  openGraphType?: "website" | "article";
  openGraphLocale?: string;
  openGraphUrl?: string;
  openGraphSiteName?: string;
  openGraphImages?: Array<{
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  }>;
  twitterCard?: "summary" | "summary_large_image";
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImages?: string[];
  canonical?: string;
  alternateLanguages?: Record<string, string>;
  alternateXDefault?: string;
};

export function buildMetadata({
  title,
  titleAbsolute,
  description,
  isIndexing = false, // デフォルトはnoindex
  keywords,
  openGraphTitle,
  openGraphDescription,
  openGraphType,
  openGraphLocale,
  openGraphUrl,
  openGraphSiteName,
  openGraphImages,
  twitterCard,
  twitterTitle,
  twitterDescription,
  twitterImages,
  canonical,
  alternateLanguages,
  alternateXDefault,
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

  const hasOpenGraph =
    openGraphTitle || openGraphDescription || openGraphType || openGraphImages;
  const openGraph = hasOpenGraph
    ? {
        type: openGraphType ?? ("website" as const),
        locale: openGraphLocale,
        url: openGraphUrl,
        siteName: openGraphSiteName,
        title: openGraphTitle ?? titleAbsolute ?? title ?? undefined,
        description: openGraphDescription ?? description ?? undefined,
        images: openGraphImages,
      }
    : undefined;

  const hasTwitter =
    twitterCard || twitterTitle || twitterDescription || twitterImages;
  const twitter = hasTwitter
    ? {
        card: twitterCard ?? ("summary_large_image" as const),
        title:
          twitterTitle ?? openGraphTitle ?? titleAbsolute ?? title ?? undefined,
        description:
          twitterDescription ??
          openGraphDescription ??
          description ??
          undefined,
        images: twitterImages,
      }
    : undefined;

  const languages =
    alternateLanguages || alternateXDefault
      ? {
          ...(alternateLanguages ?? {}),
          ...(alternateXDefault ? { "x-default": alternateXDefault } : {}),
        }
      : undefined;

  const alternates = canonical
    ? {
        canonical,
        ...(languages ? { languages } : {}),
      }
    : languages
      ? { languages }
      : undefined;

  return {
    title: titleValue,
    description,
    keywords,
    robots,
    openGraph,
    twitter,
    alternates,
  };
}
