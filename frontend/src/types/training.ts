export type TrainingPageAttachment = {
  id: string;
  type: string;
  url: string;
  thumbnail_url: string | null;
  original_filename: string | null;
};

// #280 タグごとのメモ（タグ1〜3個 + 本文）
export type TrainingPageMemoTag = {
  id: string;
  name: string;
  category: string;
};

export type TrainingPageMemo = {
  id: string;
  content: string;
  sort_order: number;
  tags: TrainingPageMemoTag[];
};

export type PageInputMode = "free" | "tag_based";

export type TrainingPageData = {
  id: string;
  title: string;
  content: string;
  // #280 入力モード（未指定は free 扱い）
  content_mode: PageInputMode;
  is_public: boolean;
  date: string;
  tags: string[];
  // tag_based のときのみ要素を持つ
  memos: TrainingPageMemo[];
  attachments: TrainingPageAttachment[];
};
