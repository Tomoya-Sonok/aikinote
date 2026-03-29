import type { ReactNode } from "react";

export const URL_REGEX =
  /https?:\/\/[^\s<>"'）」》\]]+[^\s<>"'）」》\].,;:!?、。]/g;

export function linkifyText(text: string): ReactNode[] {
  URL_REGEX.lastIndex = 0;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = URL_REGEX.exec(text);

  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#2563eb", textDecoration: "underline" }}
      >
        {url}
      </a>,
    );
    lastIndex = match.index + url.length;
    match = URL_REGEX.exec(text);
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
