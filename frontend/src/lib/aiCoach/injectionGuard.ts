// AIコーチの軽量プロンプトインジェクション検知。
//
// 役割はあくまで「補強（soft）」。ここで検知したら system プロンプトへ注記を足し、
// 最終的な判断は LLM（合気道コーチとしての指示）に委ねる。ブロックはしない。
// そのため、正当な合気道の質問を誤検知しないよう、パターンは「高精度（明白な攻撃）」
// のみに絞っている（汎用語の「指示」「教えて」単独では発火させない）。

const INJECTION_PATTERNS: RegExp[] = [
  // システムプロンプト / system prompt そのものへの言及（実演された攻撃）
  /システム\s*プロンプト/,
  /system\s*prompt/i,
  // 「プロンプトを（全部）教えて/表示/出力/復唱…」など、プロンプト本体の開示要求
  // （動詞手前の「全部」「そのまま」等の短い語を挟んでも検知できるよう許容）
  /プロンプト(の(内容|全文))?(を|は)?[^。\n]{0,10}?(教え|表示|出力|見せ|開示|復唱|繰り返|そのまま)/,
  // 「あなたへの指示/設定/ルールを（全部）教えて…」など、内部指示の開示要求
  /(あなた|きみ|君|お前|貴方)へ?の?(指示|命令|設定|ルール)(を|は|について)?[^。\n]{0,10}?(教え|表示|出力|見せ|開示|復唱|繰り返)/,
  // 「これまで/上記の指示を無視/忘れて/破棄」など、既存指示の無効化
  /(これまで|今まで|上記|先ほど|最初|元)の?(指示|命令|ルール|設定|プロンプト)を?\s*(無視|忘れ|破棄|やめ|捨て)/,
  // 英語: ignore / disregard / forget ... (previous|prior|above|all) ... instructions/prompt/rules
  /\b(ignore|disregard|forget|override)\b[\s\S]{0,40}\b(instructions?|prompts?|rules?|context)\b/i,
  // よくあるジェイルブレイクの合言葉
  /\b(developer|debug|admin|jailbreak|dan|god)\s*mode\b/i,
  /\bdo\s+anything\s+now\b/i,
];

// テキストにインジェクションの疑いがあるかを判定する純粋関数。
export function detectPromptInjection(text: string): boolean {
  if (!text) return false;
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}
