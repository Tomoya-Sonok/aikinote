"use client";

import type { FC } from "react";
import { URL_REGEX } from "@/lib/utils/linkifyText";
import styles from "./HashtagText.module.css";

// ハッシュタグの正規表現（フロントエンド用）
const HASHTAG_REGEX =
  /(?:^|[\s\u3000])(#[a-zA-Z0-9\u3041-\u3096\u30A1-\u30F6\u30FC\u4E00-\u9FFF\u3005\u3006\u3024\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A_]+)/g;

type Token =
  | { type: "text"; value: string }
  | { type: "url"; value: string }
  | { type: "hashtag"; tag: string; name: string };

interface HashtagTextProps {
  content: string;
  locale: string;
}

/**
 * テキスト内の URL をクリッカブルリンクに、#xxx をハッシュタグリンクに変換して表示する。
 * URL を先に検出し、残りテキストからハッシュタグを探す（#https://... の誤検出を防止）。
 */
export const HashtagText: FC<HashtagTextProps> = ({ content, locale }) => {
  // 第1パス: URL を検出してセグメントに分割
  URL_REGEX.lastIndex = 0;
  const segments: { type: "text" | "url"; value: string }[] = [];
  let lastIndex = 0;
  let urlMatch: RegExpExecArray | null = URL_REGEX.exec(content);

  while (urlMatch !== null) {
    if (urlMatch.index > lastIndex) {
      segments.push({
        type: "text",
        value: content.slice(lastIndex, urlMatch.index),
      });
    }
    segments.push({ type: "url", value: urlMatch[0] });
    lastIndex = urlMatch.index + urlMatch[0].length;
    urlMatch = URL_REGEX.exec(content);
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  // 第2パス: テキストセグメント内のハッシュタグを検出
  const tokens: Token[] = [];

  for (const segment of segments) {
    if (segment.type === "url") {
      tokens.push(segment);
      continue;
    }

    HASHTAG_REGEX.lastIndex = 0;
    const text = segment.value;
    let hashLastIndex = 0;
    let hashMatch: RegExpExecArray | null = HASHTAG_REGEX.exec(text);

    while (hashMatch !== null) {
      const fullMatch = hashMatch[0];
      const tag = hashMatch[1];
      const matchStart = hashMatch.index;
      const prefixLength = fullMatch.length - tag.length;
      const textBefore = text.slice(hashLastIndex, matchStart + prefixLength);

      if (textBefore) {
        tokens.push({ type: "text", value: textBefore });
      }
      tokens.push({ type: "hashtag", tag, name: tag.slice(1) });
      hashLastIndex = matchStart + fullMatch.length;
      hashMatch = HASHTAG_REGEX.exec(text);
    }

    if (hashLastIndex < text.length) {
      tokens.push({ type: "text", value: text.slice(hashLastIndex) });
    }
  }

  // URL もハッシュタグもない場合はそのまま返す
  if (tokens.every((t) => t.type === "text")) {
    return <>{content}</>;
  }

  let keyIndex = 0;

  return (
    <>
      {tokens.map((token) => {
        const key = `${token.type}-${keyIndex++}`;
        if (token.type === "url") {
          return (
            <a
              key={key}
              href={token.value}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.urlLink}
              onClick={(e) => e.stopPropagation()}
            >
              {token.value}
            </a>
          );
        }
        if (token.type === "hashtag") {
          return (
            <a
              key={key}
              href={`/${locale}/social/posts/search?hashtag=${encodeURIComponent(token.name)}`}
              className={styles.hashtagLink}
              onClick={(e) => e.stopPropagation()}
            >
              {token.tag}
            </a>
          );
        }
        return <span key={key}>{token.value}</span>;
      })}
    </>
  );
};
