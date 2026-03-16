"use client";

import type { FC } from "react";
import styles from "./HashtagText.module.css";

// ハッシュタグの正規表現（フロントエンド用）
const HASHTAG_REGEX =
  /(?:^|[\s\u3000])(#[a-zA-Z0-9\u3041-\u3096\u30A1-\u30F6\u30FC\u4E00-\u9FFF\u3005\u3006\u3024\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A_]+)/g;

interface HashtagTextProps {
  content: string;
  locale: string;
}

/**
 * テキスト内の #xxx をリンク化して表示するコンポーネント。
 * ハッシュタグ部分をタップすると検索画面に遷移する。
 */
export const HashtagText: FC<HashtagTextProps> = ({ content, locale }) => {
  const parts: (string | { tag: string; name: string })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // 正規表現をリセット（グローバルフラグのため）
  HASHTAG_REGEX.lastIndex = 0;

  // biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop pattern
  while ((match = HASHTAG_REGEX.exec(content)) !== null) {
    const fullMatch = match[0];
    const tag = match[1]; // #付きのハッシュタグ
    const matchStart = match.index;

    // マッチ前のテキスト（先頭のスペースを含む場合がある）
    const prefixLength = fullMatch.length - tag.length;
    const textBefore = content.slice(lastIndex, matchStart + prefixLength);
    if (textBefore) {
      parts.push(textBefore);
    }

    // ハッシュタグ部分
    const name = tag.slice(1); // # を除去
    parts.push({ tag, name });

    lastIndex = matchStart + fullMatch.length;
  }

  // 残りのテキスト
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  // ハッシュタグが1つもない場合はそのまま表示
  if (parts.length === 0 || parts.every((p) => typeof p === "string")) {
    return <>{content}</>;
  }

  // パーツごとにユニークキーを生成
  let textPartIndex = 0;

  return (
    <>
      {parts.map((part) => {
        if (typeof part === "string") {
          const key = `text-${textPartIndex++}`;
          return <span key={key}>{part}</span>;
        }
        return (
          <a
            key={`tag-${part.name}`}
            href={`/${locale}/social/posts/search?hashtag=${encodeURIComponent(part.name)}`}
            className={styles.hashtagLink}
            onClick={(e) => e.stopPropagation()}
          >
            {part.tag}
          </a>
        );
      })}
    </>
  );
};
