import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ["ja", "en"],

  // Used when no locale matches
  defaultLocale: "ja",

  // The prefix for the locale in the pathname
  // 'as-needed' means default locale (ja) has no prefix, others have prefix
  localePrefix: "as-needed",

  // Disable automatic locale detection to prevent unwanted redirects
  // This ensures that only the URL path determines the locale
  localeDetection: false,

  // Alternative hosts for locales (optional)
  // domains: [
  //   {
  //     domain: 'example.com',
  //     defaultLocale: 'ja'
  //   },
  //   {
  //     domain: 'example.co.uk',
  //     defaultLocale: 'en'
  //   }
  // ]
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
