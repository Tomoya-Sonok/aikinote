/**
 * 認証後リダイレクト（returnTo）ユーティリティ
 *
 * SignupPromptModal 等から認証フローに入る前に現在のURLを保存し、
 * 認証完了後にそのURLへリダイレクトするための仕組み。
 *
 * - メール/PW ログイン: sessionStorage で保持（クライアント側で読み取り）
 * - Google OAuth: cookie で保持（サーバー側 /auth/callback で読み取り）
 */

export const RETURN_TO_COOKIE_NAME = "auth_return_to";
const RETURN_TO_SESSION_KEY = "auth.returnTo";
const MAX_PATH_LENGTH = 2048;

/**
 * returnTo パスのバリデーション（オープンリダイレクト防止）
 * サーバー/クライアント両方で使用可能（DOM 依存なし）
 */
export function isValidReturnTo(path: string): boolean {
  if (!path || path.length > MAX_PATH_LENGTH) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  for (let i = 0; i < path.length; i++) {
    const code = path.charCodeAt(i);
    if (code <= 0x1f || path[i] === "\\") return false;
  }
  return true;
}

/**
 * cookie + sessionStorage に returnTo パスを保存（クライアント専用）
 */
export function setReturnTo(path: string): void {
  if (!isValidReturnTo(path)) return;
  sessionStorage.setItem(RETURN_TO_SESSION_KEY, path);
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API はブラウザサポートが限定的
  document.cookie = `${RETURN_TO_COOKIE_NAME}=${encodeURIComponent(path)}; path=/; max-age=600; SameSite=Lax`;
}

/**
 * sessionStorage から returnTo パスを取得＆クリア（クライアント専用）
 */
export function getReturnToFromSession(): string | null {
  const value = sessionStorage.getItem(RETURN_TO_SESSION_KEY);
  sessionStorage.removeItem(RETURN_TO_SESSION_KEY);
  return value && isValidReturnTo(value) ? value : null;
}

/**
 * returnTo cookie をクリア（クライアント専用）
 */
export function clearReturnToCookie(): void {
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API はブラウザサポートが限定的
  document.cookie = `${RETURN_TO_COOKIE_NAME}=; path=/; max-age=0`;
}
