"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { useLanguageStore } from "@/stores/languageStore";
import { useRouter, usePathname } from "next/navigation";

interface LanguageProviderProps {
	children: ReactNode;
	locale: string;
}

export function LanguageProvider({
	children,
	locale
}: LanguageProviderProps) {
	const { language, setLanguage } = useLanguageStore();
	const router = useRouter();
	const pathname = usePathname();
	const isInitializedRef = useRef(false);

	// 初回マウント時にストアの言語をロケールと同期（リダイレクトなし）
	useEffect(() => {
		if (!isInitializedRef.current) {
			// 現在のロケールに合わせてストアを更新（リダイレクトは行わない）
			setLanguage(locale as any);
			isInitializedRef.current = true;
		}
	}, [locale, setLanguage]);

	// 言語が変更された時のパス変更処理（ユーザーが明示的に変更した場合のみ）
	useEffect(() => {
		if (isInitializedRef.current && language !== locale) {
			// 新しいi18nルーティング構造に対応
			// 日本語: / (middlewareが/jaにリライト)
			// 英語: /en/...

			let newPath: string;

			if (language === 'ja') {
				// 英語パス(/en/...)から日本語パス(プレフィックスなし)に変更
				newPath = pathname.replace(/^\/en/, '') || '/';
			} else if (language === 'en') {
				// 日本語パスから英語パス(/en/...)に変更
				if (pathname.startsWith('/en/')) {
					// 既に英語パスの場合はそのまま
					newPath = pathname;
				} else {
					// 日本語パスから英語パスに変換
					newPath = pathname === '/' ? '/en' : `/en${pathname}`;
				}
			} else {
				return; // 未対応の言語
			}

			router.push(newPath);
		}
	}, [language, locale, pathname, router]);

	return <>{children}</>;
}