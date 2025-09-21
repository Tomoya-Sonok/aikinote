import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from 'next/navigation';
import { routing } from '@/lib/i18n/routing';
import { ToastProvider } from "@/contexts/ToastContext";
import { FontSizeProvider } from "@/components/providers/FontSizeProvider";

interface LocaleLayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: LocaleLayoutProps) {
  // 有効なロケールかチェック
  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
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
  return routing.locales.map((locale) => ({ locale }))
}
