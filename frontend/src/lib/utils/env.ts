/**
 * 環境変数の統一管理
 * アプリケーション全体で一貫した環境変数アクセスを提供
 */

/**
 * アプリケーションのベースURLを取得する
 * 開発環境、ステージング環境、本番環境で一貫したURL取得を行う
 */
export function getBaseUrl(): string {
  // 1. 環境変数 NEXT_PUBLIC_APP_URL を最優先 (本番環境・プレビュー環境で手動設定する場合)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // 2. Vercelが自動設定する公開URL (クライアントサイドでも利用可能)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  // 3. サーバーサイドでVercelのURL (System Environment Variable)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 4. クライアントサイドならブラウザのオリジンを使用
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // 5. 開発環境なら localhost
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  // フォールバック（本来は設定すべき）
  console.warn(
    "[Warn] getBaseUrl: Base URL not configured. Using localhost fallback.",
    "Please set NEXT_PUBLIC_APP_URL environment variable.",
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
