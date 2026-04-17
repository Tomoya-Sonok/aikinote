/**
 * LINE内蔵ブラウザ対策: 外部配布URLにも ?openExternalBrowser=1 を付与すること
 *
 * TODO: 以下のURLは手動で openExternalBrowser=1 を付与する対象（Tomoya確認用）
 * - note.com 記事内の AikiNote リンク
 * - LINE公式アカウントのリッチメニュー / 配信メッセージ内リンク
 * - Instagram bio / ストーリーズ内リンク
 * - X（Twitter）固定ポスト / プロフィール内リンク
 *
 * 注意: openExternalBrowser=1 は LINE 独自パラメータのため、
 * X / Instagram の内蔵ブラウザには効かない。それらは別タスクで対応する。
 */

/**
 * LINE内蔵ブラウザから外部ブラウザへ誘導するためのパラメータ付き共有URLを生成する。
 * Google / Apple OAuth が LINE WebView でブロックされる問題を回避する。
 *
 * @param path - ロケール含むパス（例: `/ja/social/posts/123`）
 */
export function buildShareUrl(path: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://www.aikinote.com";

  const url = new URL(path.startsWith("/") ? path : `/${path}`, origin);
  // LINE内蔵ブラウザから外部ブラウザへ誘導するためのLINE独自パラメータ
  url.searchParams.set("openExternalBrowser", "1");
  return url.toString();
}
