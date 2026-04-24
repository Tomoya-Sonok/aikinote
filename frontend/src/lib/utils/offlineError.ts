/**
 * オフライン時はその旨をユーザーに伝え、オンライン時は既存のフォールバック文言を返す。
 * 全てのミューテーション catch で同一文言を使うためのヘルパ。
 *
 * サーバー側が落ちている場合の fetch 失敗と、端末のオフラインを区別することで
 * 「なんでダメなのか」がユーザーに伝わるようにする。
 */
export function getNetworkAwareErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "オフラインです。ネットワークに接続してから再度お試しください。";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

/**
 * 現在オフラインかを返す。mutation の submit ハンドラ冒頭で早期 return したい時に使う。
 * フック使えない関数内（callback 内など）で使う想定。
 */
export function isCurrentlyOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
