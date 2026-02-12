import { routing } from "@/lib/i18n/routing";

const normalizePath = (path: string) => {
  return path.startsWith("/") ? path : `/${path}`;
};

export const buildDefaultLocalePath = (path: string) => {
  return `/${routing.defaultLocale}${normalizePath(path)}`;
};
