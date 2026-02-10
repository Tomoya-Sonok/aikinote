import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ja";

export default getRequestConfig(async ({ locale }) => {
  // 有効なロケールかチェック
  if (!locales.includes(locale as Locale)) notFound();

  const resolvedLocale = locale as Locale;

  return {
    locale: resolvedLocale,
    messages: (await import(`../../translations/${resolvedLocale}.json`))
      .default,
  };
});
