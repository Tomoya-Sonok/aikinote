// #281 AIコーチ（RAG）の設定値

// 利用回数（1メッセージ = 1カウント）
// Free: 生涯合計まで。Premium: 1日あたり。
export const AI_COACH_FREE_LIFETIME_LIMIT = 2;
export const AI_COACH_PREMIUM_DAILY_LIMIT = 20;

// 利用モデル（最も安価な Gemini）
export const AI_COACH_MODEL = "gemini-2.5-flash-lite";

// 稽古記録コーパスの最大文字数（トークン消費・レイテンシのガード）。
// 超過時は新しい順に打ち切り、コンテキストへ省略を明示する。
export const AI_COACH_CONTEXT_CHAR_BUDGET = 200_000;

// クイックアクション（定型プロンプト）の識別子。文言は i18n（aiCoach.quickActions.*）で持つ。
export const AI_COACH_QUICK_ACTION_IDS = [
  "weeklyReview",
  "weakPoints",
  "freeTechnique",
  "improvementAdvice",
] as const;

export type AiCoachQuickActionId = (typeof AI_COACH_QUICK_ACTION_IDS)[number];
