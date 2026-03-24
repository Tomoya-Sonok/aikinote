"use client";

import {
  type ChangeEvent,
  type FC,
  type Ref,
  useCallback,
  useEffect,
  useRef,
} from "react";
import styles from "./HashtagTextarea.module.css";

// ハッシュタグの正規表現（入力中のハイライト用）
const HASHTAG_REGEX =
  /(?:^|[\s\u3000])(#[a-zA-Z0-9\u3041-\u3096\u30A1-\u30F6\u30FC\u4E00-\u9FFF\u3005\u3006\u3024\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A_]+)/g;

interface HashtagTextareaProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  textareaRef?: Ref<HTMLTextAreaElement>;
  rows?: number;
}

/**
 * ミラーDiv方式でハッシュタグをリアルタイムハイライトするtextareaコンポーネント。
 *
 * 構造:
 *   container (position: relative のみ。外部classNameは付けない)
 *   ├── mirror  (absolute, inset:0, 外部className, border/bg透過)
 *   └── textarea (relative, 外部className, color/bg透過)
 *
 * ミラーとtextareaに同じ外部classNameを適用し、
 * padding/border/fontを完全一致させてテキスト位置を揃える。
 */
export const HashtagTextarea: FC<HashtagTextareaProps> = ({
  value,
  onChange,
  placeholder,
  maxLength,
  className,
  textareaRef,
  rows,
}) => {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const internalTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const syncScroll = useCallback(() => {
    const textarea = internalTextareaRef.current;
    const mirror = mirrorRef.current;
    if (textarea && mirror) {
      mirror.scrollTop = textarea.scrollTop;
    }
  }, []);

  // textareaの高さ変動に合わせてミラーDivの高さを同期
  // biome-ignore lint/correctness/useExhaustiveDependencies: value変更時にミラーの高さを再計算する必要がある
  useEffect(() => {
    const textarea = internalTextareaRef.current;
    const mirror = mirrorRef.current;
    if (textarea && mirror) {
      mirror.style.height = `${textarea.offsetHeight}px`;
    }
  }, [value]);

  // ハッシュタグ部分をハイライトしたHTMLを生成
  const renderHighlightedContent = () => {
    if (!value) return "";

    const parts: string[] = [];
    let lastIndex = 0;

    HASHTAG_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    // biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop pattern
    while ((match = HASHTAG_REGEX.exec(value)) !== null) {
      const fullMatch = match[0];
      const tag = match[1];
      const matchStart = match.index;
      const prefixLength = fullMatch.length - tag.length;

      const textBefore = value.slice(lastIndex, matchStart + prefixLength);
      if (textBefore) {
        parts.push(escapeHtml(textBefore));
      }

      parts.push(`<span class="${styles.highlight}">${escapeHtml(tag)}</span>`);

      lastIndex = matchStart + fullMatch.length;
    }

    if (lastIndex < value.length) {
      parts.push(escapeHtml(value.slice(lastIndex)));
    }

    // 末尾の改行を保持するためにダミー文字を追加
    return `${parts.join("")}\n`;
  };

  const setRefs = useCallback(
    (el: HTMLTextAreaElement | null) => {
      internalTextareaRef.current = el;
      if (typeof textareaRef === "function") {
        textareaRef(el);
      } else if (textareaRef && "current" in textareaRef) {
        (
          textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>
        ).current = el;
      }
    },
    [textareaRef],
  );

  return (
    <div className={styles.container}>
      {/* ミラーDiv: textareaと同じ外部classNameで同一レイアウト、border/bg透過 */}
      <div
        ref={mirrorRef}
        className={`${styles.mirror} ${className ?? ""}`}
        aria-hidden="true"
        style={{
          background: "transparent",
          borderColor: "transparent",
        }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: mirror div for hashtag highlighting
        dangerouslySetInnerHTML={{ __html: renderHighlightedContent() }}
      />
      {/* textarea: 外部classNameでレイアウト一致、文字色/bg透過でミラーが見える */}
      <textarea
        ref={setRefs}
        value={value}
        onChange={onChange}
        onScroll={syncScroll}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className={`${styles.textarea} ${className ?? ""}`}
        style={{ color: "transparent", background: "transparent" }}
      />
    </div>
  );
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
