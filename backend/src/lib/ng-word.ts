import type { SupabaseClient } from "@supabase/supabase-js";

let cachedWords: string[] = [];
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5分

export async function loadNgWords(supabase: SupabaseClient): Promise<string[]> {
  const now = Date.now();
  if (cachedWords.length > 0 && cacheExpiresAt > now) {
    return cachedWords;
  }

  const { data, error } = await supabase.from("NgWord").select("word");

  if (error) {
    console.error("NGワード取得エラー:", error);
    return cachedWords;
  }

  cachedWords = (data ?? []).map((row) => normalizeText(row.word));
  cacheExpiresAt = now + CACHE_TTL_MS;
  return cachedWords;
}

export function normalizeText(text: string): string {
  let result = text.toLowerCase();

  // 全角英数→半角
  result = result.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );

  // カタカナ→ひらがな
  result = result.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );

  // 空白・区切り文字・ゼロ幅文字を除去
  result = result.replace(
    /[\s\u3000\-_.,!?・。、！？\u200B\u200C\uFEFF]|\u200D/g,
    "",
  );

  return result;
}

export async function containsNgWord(
  text: string,
  supabase: SupabaseClient,
): Promise<{ found: boolean; matchedWord?: string }> {
  const words = await loadNgWords(supabase);
  const normalized = normalizeText(text);

  for (const word of words) {
    if (normalized.includes(word)) {
      return { found: true, matchedWord: word };
    }
  }

  return { found: false };
}
