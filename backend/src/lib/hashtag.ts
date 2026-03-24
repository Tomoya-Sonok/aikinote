/**
 * 投稿コンテンツからハッシュタグを抽出するユーティリティ
 */

const MAX_HASHTAGS = 20;

// ハッシュタグの正規表現:
// - 行頭またはスペース（半角/全角）の直後の # に続く文字列
// - 対応文字: ひらがな、カタカナ、漢字、英数字（半角/全角）、アンダースコア
const HASHTAG_REGEX =
  /(?:^|[\s\u3000])#([a-zA-Z0-9\u3041-\u3096\u30A1-\u30F6\u30FC\u4E00-\u9FFF\u3005\u3006\u3024\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A_]+)/g;

/**
 * コンテンツ文字列からハッシュタグを抽出し、正規化済みの名前配列を返す。
 * '#' プレフィックスは含まない。重複は排除される。
 * @param content 投稿の本文テキスト
 * @returns ハッシュタグ名の配列（最大20個）
 */
export function extractHashtags(content: string): string[] {
  const tags = new Set<string>();

  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop pattern
  while ((match = HASHTAG_REGEX.exec(content)) !== null) {
    const tag = match[1];
    if (tag && tag.length > 0) {
      tags.add(tag);
    }
    if (tags.size >= MAX_HASHTAGS) break;
  }

  return [...tags];
}
