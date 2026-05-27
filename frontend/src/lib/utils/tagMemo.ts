import type {
  MemoDraft,
  MemoTagRef,
} from "@/components/features/personal/TagMemoEditor/TagMemoEditor";
import type { MemoPayload } from "@/lib/api/client";
import type { UserCategory } from "@/types/category";

export type MemoStatus = "empty" | "partial" | "complete";

const tagRefKey = (tag: MemoTagRef): string => `${tag.category}${tag.name}`;

// カテゴリ別の選択済みタグを、メモの候補タグ（name + category）配列に変換する
export const buildAvailableTags = (
  categories: UserCategory[],
  selectedByCategory: Record<string, string[]>,
): MemoTagRef[] => {
  const result: MemoTagRef[] = [];
  for (const cat of categories) {
    const selected = selectedByCategory[cat.name] ?? [];
    for (const name of selected) {
      result.push({ name, category: cat.name });
    }
  }
  return result;
};

// 1メモの入力状態を判定する
// - empty: タグも本文も未入力（保存時に無視する）
// - complete: タグ1個以上 + 本文あり
// - partial: 片方だけ入力（保存をブロックする）
export const memoStatusOf = (memo: MemoDraft): MemoStatus => {
  const hasTags = memo.tags.length > 0;
  const hasContent = memo.content.trim().length > 0;
  if (!hasTags && !hasContent) return "empty";
  if (hasTags && hasContent) return "complete";
  return "partial";
};

// 候補から外れたタグをメモから取り除く（カテゴリ側でタグ選択を解除した場合の追従）
export const pruneMemoTags = (
  memos: MemoDraft[],
  availableTags: MemoTagRef[],
): MemoDraft[] => {
  const allowed = new Set(availableTags.map(tagRefKey));
  let changed = false;
  const next = memos.map((memo) => {
    const filtered = memo.tags.filter((tag) => allowed.has(tagRefKey(tag)));
    if (filtered.length !== memo.tags.length) {
      changed = true;
      return { ...memo, tags: filtered };
    }
    return memo;
  });
  return changed ? next : memos;
};

// 差分検出用に、メモ下書きを正規化した文字列にする（id は無視）
export const normalizeMemoDrafts = (memos: MemoDraft[]): string =>
  JSON.stringify(
    memos.map((memo) => ({ tags: memo.tags, content: memo.content.trim() })),
  );

// 保存用ペイロードへ変換（complete なメモのみ）
export const toMemoPayloads = (memos: MemoDraft[]): MemoPayload[] =>
  memos
    .filter((memo) => memoStatusOf(memo) === "complete")
    .map((memo) => ({
      tags: memo.tags.map((tag) => ({
        name: tag.name,
        category: tag.category,
      })),
      content: memo.content.trim(),
    }));
