import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // This can either be defined statically at the top level of the file,
  // or alternatively sourced from a database/API. However, it cannot be
  // dependent on a request.

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
    messages: (await import(`../../translations/${locale}.json`)).default,
  };
});
