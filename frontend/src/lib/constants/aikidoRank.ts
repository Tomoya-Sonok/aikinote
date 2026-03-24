/**
 * 合気道の段級位オプション
 * 検索フィルター・基本情報編集・プロフィール編集で共通利用
 */
export const AIKIDO_RANK_OPTIONS = [
  "十段",
  "九段",
  "八段",
  "七段",
  "六段",
  "五段",
  "四段",
  "三段",
  "二段",
  "初段",
  "一級",
  "二級",
  "三級",
  "四級",
  "五級",
] as const;

export type AikidoRank = (typeof AIKIDO_RANK_OPTIONS)[number];
