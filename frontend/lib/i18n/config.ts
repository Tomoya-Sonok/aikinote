import { getRequestConfig } from 'next-intl/server'
import { notFound } from 'next/navigation'

export const locales = ['ja', 'en'] as const
export type Locale = typeof locales[number]

export const defaultLocale: Locale = 'ja'

export default getRequestConfig(async ({ locale }) => {
  // 有効なロケールかチェック
  if (!locales.includes(locale as Locale)) notFound()

  return {
    messages: (await import(`../../messages/${locale}.json`)).default
  }
})