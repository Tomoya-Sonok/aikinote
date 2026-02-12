import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { FontSizeProvider } from "@/components/providers/FontSizeProvider";
import { LocaleInitializer } from "@/components/providers/LocaleInitializer";
import { ToastProvider } from "@/contexts/ToastContext";
import { routing } from "@/lib/i18n/routing";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // 有効なロケールかチェック
  const isSupportedLocale = routing.locales.some(
    (supportedLocale) => supportedLocale === locale,
  );
  if (!isSupportedLocale) {
    notFound();
  }

  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleInitializer />
      <FontSizeProvider>
        <ToastProvider>
          <main
            style={{ background: "var(--aikinote-bg)", minHeight: "100vh" }}
          >
            {children}
          </main>
        </ToastProvider>
      </FontSizeProvider>
    </NextIntlClientProvider>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
