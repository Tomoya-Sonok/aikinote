import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { OfflineBanner } from "@/components/shared/OfflineBanner/OfflineBanner";
import { FontSizeProvider } from "@/components/shared/providers/FontSizeProvider";
import { LocaleInitializer } from "@/components/shared/providers/LocaleInitializer";
import { QueryProvider } from "@/components/shared/providers/QueryProvider";
import { ToastProvider } from "@/contexts/ToastContext";
import { AuthProvider } from "@/lib/hooks/useAuth";
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
      <QueryProvider>
        <FontSizeProvider>
          <ToastProvider>
            {/*
              AuthProvider を QueryProvider と ToastProvider の内側に置くことで、
              useAuth 内部の showToast / queryClient アクセスが安全に動作するようにする。
              ここで Provider を一箇所だけにするのが肝要（各コンポーネントでの useAuth 重複呼び出しを
              そのまま単一 Context 参照に変換するため）。
            */}
            <AuthProvider>
              <OfflineBanner />
              <main
                style={{ background: "var(--bg-base)", minHeight: "100vh" }}
              >
                {children}
              </main>
            </AuthProvider>
          </ToastProvider>
        </FontSizeProvider>
      </QueryProvider>
    </NextIntlClientProvider>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
