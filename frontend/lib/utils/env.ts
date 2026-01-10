/**
 * 環境変数の統一管理
 * アプリケーション全体で一貫した環境変数アクセスを提供
 */

/**
 * アプリケーションのベースURLを取得する
 * 開発環境、ステージング環境、本番環境で一貫したURL取得を行う
 */
export function getBaseUrl(): string {
	// 開発環境でのデフォルト
	if (process.env.NODE_ENV === "development") {
		return "http://localhost:3000";
	}

	// 本番環境では NEXT_PUBLIC_APP_URL を優先
	if (process.env.NEXT_PUBLIC_APP_URL) {
		return process.env.NEXT_PUBLIC_APP_URL;
	}

	// NextAuth.js用の環境変数をフォールバック
	if (process.env.NEXTAUTH_URL) {
		return process.env.NEXTAUTH_URL;
	}

	// 古い環境変数名をフォールバック
	if (process.env.APP_URL) {
		return process.env.APP_URL;
	}

	// Vercelの自動設定を利用
	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}

	// フォールバック（本来は設定すべき）
	console.warn(
		"ベースURLが設定されていません。NEXT_PUBLIC_APP_URL環境変数を設定してください。",
	);
	return "http://localhost:3000";
}

/**
 * APIのベースURLを取得する（内部API呼び出し用）
 * サーバーサイドでの内部API呼び出しで使用
 */
export function getApiBaseUrl(): string {
	// サーバーサイドでの内部API呼び出しの場合
	if (typeof window === "undefined") {
		return getBaseUrl();
	}

	// クライアントサイドでは相対パスを使用
	return "";
}

/**
 * リダイレクト用のURLを取得する
 * OAuth認証やメール認証のリダイレクトで使用
 */
export function getRedirectUrl(path: string = ""): string {
	const baseUrl = getBaseUrl();
	const cleanPath = path.startsWith("/") ? path : `/${path}`;
	return `${baseUrl}${cleanPath}`;
}

/**
 * 環境変数が正しく設定されているかチェックする
 */
export function validateEnvironmentVariables(): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// 必須の環境変数をチェック
	if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
		errors.push("NEXT_PUBLIC_SUPABASE_URL が設定されていません");
	}

	if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
		errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません");
	}

	if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
		errors.push("SUPABASE_SERVICE_ROLE_KEY が設定されていません");
	}

	// 本番環境では追加のチェック
	if (process.env.NODE_ENV === "production") {
		if (!process.env.NEXT_PUBLIC_APP_URL) {
			errors.push("本番環境では NEXT_PUBLIC_APP_URL の設定が推奨されます");
		}

		if (!process.env.RESEND_API_KEY) {
			errors.push(
				"RESEND_API_KEY が設定されていません（メール送信機能が利用できません）",
			);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * 開発環境かどうかを判定する
 */
export function isDevelopment(): boolean {
	return process.env.NODE_ENV === "development";
}

/**
 * 本番環境かどうかを判定する
 */
export function isProduction(): boolean {
	return process.env.NODE_ENV === "production";
}

/**
 * Vercel環境かどうかを判定する
 */
export function isVercel(): boolean {
	return !!process.env.VERCEL;
}
