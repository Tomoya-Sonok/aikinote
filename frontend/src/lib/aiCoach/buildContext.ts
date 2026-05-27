import { AI_COACH_CONTEXT_CHAR_BUDGET } from "./constants";

export type TrainingRecordForContext = {
  title: string;
  content: string;
  date: string; // ISO 文字列
  tags: string[];
};

// AIコーチのシステム指示（合気道コーチとして振る舞い、ユーザーの稽古記録を根拠に回答する）
export const AI_COACH_SYSTEM_PROMPT = [
  "あなたは合気道の稽古を支える、経験豊富で親しみやすいAIコーチです。",
  "ユーザーがこれまでに書き溜めた稽古記録を根拠に、振り返りの手助けや上達のアドバイス、自由技の提案などを行います。",
  "回答は日本語で、具体的かつ簡潔に。記録から読み取れないことは断定せず、推測であることを明示してください。",
  "高齢の稽古者にも伝わるよう、専門用語には簡単な補足を添えると親切です。",
].join("\n");

const formatRecord = (record: TrainingRecordForContext): string => {
  const date = record.date.slice(0, 10);
  const tags = record.tags.length > 0 ? record.tags.join("、") : "（タグなし）";
  return `- ${date}「${record.title}」[${tags}]\n${record.content}`.trim();
};

// 稽古記録を新しい順にコンテキスト文字列へ整形する。
// 文字数予算を超える分は打ち切り、truncated を true にする。
export function buildRecordsContext(
  records: TrainingRecordForContext[],
  options: { maxChars?: number } = {},
): { text: string; includedCount: number; truncated: boolean } {
  const maxChars = options.maxChars ?? AI_COACH_CONTEXT_CHAR_BUDGET;

  const blocks: string[] = [];
  let total = 0;
  let truncated = false;

  for (const record of records) {
    const block = formatRecord(record);
    if (total + block.length > maxChars && blocks.length > 0) {
      truncated = true;
      break;
    }
    blocks.push(block);
    total += block.length + 1;
  }

  const header =
    records.length === 0
      ? "（まだ稽古記録がありません）"
      : `以下はユーザーの稽古記録です（新しい順${truncated ? "、古い記録は一部省略しています" : ""}）。`;

  return {
    text: `${header}\n\n${blocks.join("\n\n")}`.trim(),
    includedCount: blocks.length,
    truncated,
  };
}
