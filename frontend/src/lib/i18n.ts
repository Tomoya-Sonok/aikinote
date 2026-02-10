import { getRequestConfig } from "next-intl/server";
import { routing } from "./i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  const isSupportedLocale = (
    value: string | undefined,
  ): value is (typeof routing.locales)[number] =>
    typeof value === "string" && routing.locales.includes(value);

  // Ensure that a valid locale is used
  if (!isSupportedLocale(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
