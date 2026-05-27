import { describe, expect, it } from "vitest";
import type { MemoDraft } from "@/components/features/personal/TagMemoEditor/TagMemoEditor";
import type { UserCategory } from "@/types/category";
import {
  buildAvailableTags,
  memoStatusOf,
  normalizeMemoDrafts,
  pruneMemoTags,
  toMemoPayloads,
} from "./tagMemo";

const cat = (name: string, slug: string): UserCategory => ({
  id: `cat-${slug}`,
  user_id: "u1",
  name,
  slug,
  sort_order: 0,
  is_default: true,
  created_at: "2026-01-01T00:00:00.000Z",
});

const memo = (
  id: string,
  tags: { name: string; category: string }[],
  content: string,
): MemoDraft => ({ id, tags, content });

describe("buildAvailableTags", () => {
  it("カテゴリ別の選択タグを name+category の配列へ変換する", () => {
    // Arrange
    const categories = [cat("取り", "tori"), cat("受け", "uke")];
    const selectedByCategory = { 取り: ["立技"], 受け: ["正面打ち", "突き"] };

    // Act
    const result = buildAvailableTags(categories, selectedByCategory);

    // Assert
    expect(result).toEqual([
      { name: "立技", category: "取り" },
      { name: "正面打ち", category: "受け" },
      { name: "突き", category: "受け" },
    ]);
  });
});

describe("memoStatusOf", () => {
  it("タグも本文も無いメモは empty", () => {
    // Arrange & Act & Assert
    expect(memoStatusOf(memo("1", [], ""))).toBe("empty");
  });

  it("タグと本文の両方があるメモは complete", () => {
    // Arrange & Act & Assert
    expect(
      memoStatusOf(memo("1", [{ name: "立技", category: "取り" }], "学び")),
    ).toBe("complete");
  });

  it("タグのみ・本文のみのメモは partial", () => {
    // Arrange & Act & Assert
    expect(
      memoStatusOf(memo("1", [{ name: "立技", category: "取り" }], "")),
    ).toBe("partial");
    expect(memoStatusOf(memo("2", [], "本文だけ"))).toBe("partial");
  });
});

describe("pruneMemoTags", () => {
  it("候補から外れたタグをメモから取り除く", () => {
    // Arrange
    const memos = [
      memo(
        "1",
        [
          { name: "立技", category: "取り" },
          { name: "正面打ち", category: "受け" },
        ],
        "学び",
      ),
    ];
    const available = [{ name: "立技", category: "取り" }];

    // Act
    const result = pruneMemoTags(memos, available);

    // Assert
    expect(result[0].tags).toEqual([{ name: "立技", category: "取り" }]);
  });

  it("変更が無ければ同じ配列参照を返す", () => {
    // Arrange
    const memos = [memo("1", [{ name: "立技", category: "取り" }], "学び")];
    const available = [{ name: "立技", category: "取り" }];

    // Act
    const result = pruneMemoTags(memos, available);

    // Assert
    expect(result).toBe(memos);
  });
});

describe("toMemoPayloads", () => {
  it("complete なメモだけをペイロードに変換し、本文は trim される", () => {
    // Arrange
    const memos = [
      memo("1", [{ name: "立技", category: "取り" }], "  学び  "),
      memo("2", [], ""), // empty → 除外
      memo("3", [{ name: "突き", category: "受け" }], ""), // partial → 除外
    ];

    // Act
    const result = toMemoPayloads(memos);

    // Assert
    expect(result).toEqual([
      { tags: [{ name: "立技", category: "取り" }], content: "学び" },
    ]);
  });
});

describe("normalizeMemoDrafts", () => {
  it("id を無視し tags と trim 済み本文で正規化する（差分検出用）", () => {
    // Arrange
    const a = [memo("id-a", [{ name: "立技", category: "取り" }], "学び ")];
    const b = [memo("id-b", [{ name: "立技", category: "取り" }], "学び")];

    // Act & Assert
    expect(normalizeMemoDrafts(a)).toBe(normalizeMemoDrafts(b));
  });
});
