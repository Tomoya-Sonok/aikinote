import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TagStatItem } from "@/lib/hooks/useTrainingStats";
import type { UserCategory } from "@/types/category";
import { paletteFor, prepareChartData, TagTrendChart } from "./TagTrendChart";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const dict: Record<string, string> = {
      categoryTori: "取り",
      categoryUke: "受け",
      categoryWaza: "技",
      others: "その他",
    };
    return dict[key] ?? key;
  },
}));

// Recharts の ResponsiveContainer は happy-dom 環境で width/height が 0 になり、
// 子の SVG が描画されない。タイトル（h4）はコンテナ外なので影響なし。
// SVG 内部の検証は本テストの対象外（prepareChartData / paletteFor の単体テストでカバー）。

const makeCategory = (
  override: Partial<UserCategory> & { id: string; slug: string; name: string },
): UserCategory => ({
  user_id: "u1",
  sort_order: 0,
  is_default: true,
  created_at: "2026-01-01T00:00:00Z",
  ...override,
});

const makeTag = (
  override: Partial<TagStatItem> & {
    tag_id: string;
    tag_name: string;
    category: string;
    page_count: number;
  },
): TagStatItem => ({
  ...override,
});

describe("paletteFor", () => {
  it("0〜4 の index で異なるパレットを返す", () => {
    // Arrange / Act
    const palettes = [0, 1, 2, 3, 4].map((i) => paletteFor(i));

    // Assert
    const bases = palettes.map((p) => p.base);
    expect(new Set(bases).size).toBe(5);
    palettes.forEach((p) => {
      expect(p.shades.length).toBeGreaterThanOrEqual(6);
    });
  });

  it("index が 5 以上のときは最後のパレットにフォールバックする", () => {
    // Arrange / Act
    const last = paletteFor(4);
    const overflow = paletteFor(99);

    // Assert
    expect(overflow.base).toBe(last.base);
    expect(overflow.shades).toEqual(last.shades);
  });
});

describe("prepareChartData", () => {
  it("カテゴリ名でフィルタし page_count 降順でソートする", () => {
    // Arrange
    const tags: TagStatItem[] = [
      makeTag({
        tag_id: "1",
        tag_name: "立技",
        category: "取り",
        page_count: 3,
      }),
      makeTag({
        tag_id: "2",
        tag_name: "半身半立",
        category: "取り",
        page_count: 7,
      }),
      makeTag({
        tag_id: "3",
        tag_name: "片手取り",
        category: "受け",
        page_count: 9,
      }),
    ];
    const shades = ["#a", "#b", "#c", "#d", "#e", "#f"];

    // Act
    const result = prepareChartData(tags, "取り", shades, "その他");

    // Assert
    expect(result).toEqual([
      { name: "半身半立", value: 7, color: "#a" },
      { name: "立技", value: 3, color: "#b" },
    ]);
  });

  it("MAX_TAGS(5)を超えたタグは「その他」に集約される", () => {
    // Arrange
    const tags: TagStatItem[] = Array.from({ length: 7 }, (_, i) =>
      makeTag({
        tag_id: `t${i}`,
        tag_name: `tag${i}`,
        category: "技",
        page_count: 7 - i,
      }),
    );
    const shades = ["#1", "#2", "#3", "#4", "#5", "#6"];

    // Act
    const result = prepareChartData(tags, "技", shades, "その他");

    // Assert
    expect(result.length).toBe(6);
    expect(result[5]).toEqual({
      name: "その他",
      value: 1 + 2, // 残り2件 (page_count=2,1) の合計
      color: "#6",
    });
  });

  it("該当カテゴリのタグが無いときは空配列を返す", () => {
    // Arrange
    const tags: TagStatItem[] = [
      makeTag({ tag_id: "1", tag_name: "x", category: "取り", page_count: 1 }),
    ];

    // Act
    const result = prepareChartData(tags, "存在しない", ["#a"], "その他");

    // Assert
    expect(result).toEqual([]);
  });
});

describe("TagTrendChart", () => {
  it("sort_order 順に5カテゴリすべてのセクションが描画される", () => {
    // Arrange
    const categories: UserCategory[] = [
      makeCategory({ id: "c0", slug: "tori", name: "取り", sort_order: 0 }),
      makeCategory({ id: "c1", slug: "uke", name: "受け", sort_order: 1 }),
      makeCategory({ id: "c2", slug: "waza", name: "技", sort_order: 2 }),
      makeCategory({
        id: "c3",
        slug: "shisei",
        name: "姿勢",
        sort_order: 3,
        is_default: false,
      }),
      makeCategory({
        id: "c4",
        slug: "kokyu",
        name: "呼吸",
        sort_order: 4,
        is_default: false,
      }),
    ];
    const tagStats: TagStatItem[] = [
      makeTag({
        tag_id: "t1",
        tag_name: "立技",
        category: "取り",
        page_count: 1,
      }),
      makeTag({
        tag_id: "t2",
        tag_name: "片手取り",
        category: "受け",
        page_count: 1,
      }),
      makeTag({
        tag_id: "t3",
        tag_name: "一教",
        category: "技",
        page_count: 1,
      }),
      makeTag({
        tag_id: "t4",
        tag_name: "正座",
        category: "姿勢",
        page_count: 1,
      }),
      makeTag({
        tag_id: "t5",
        tag_name: "腹式",
        category: "呼吸",
        page_count: 1,
      }),
    ];

    // Act
    render(
      <TagTrendChart
        tagStats={tagStats}
        categories={categories}
        chartType="bar"
      />,
    );

    // Assert: 初期3カテゴリは翻訳キー由来、追加2カテゴリは name 直表示
    expect(
      screen.getByRole("heading", { level: 4, name: "取り" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 4, name: "受け" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 4, name: "技" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 4, name: "姿勢" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 4, name: "呼吸" }),
    ).toBeInTheDocument();
  });

  it("初期カテゴリをユーザーがリネームしても slug ベースで翻訳キー由来のタイトルが使われる", () => {
    // Arrange: 「取り」を「投げ」にリネームしたが slug は tori のまま
    const categories: UserCategory[] = [
      makeCategory({ id: "c0", slug: "tori", name: "投げ", sort_order: 0 }),
    ];
    const tagStats: TagStatItem[] = [
      makeTag({
        tag_id: "t1",
        tag_name: "立技",
        category: "投げ",
        page_count: 1,
      }),
    ];

    // Act
    render(
      <TagTrendChart
        tagStats={tagStats}
        categories={categories}
        chartType="bar"
      />,
    );

    // Assert: name は「投げ」だが、slug=tori なので翻訳キー由来の「取り」が出る
    expect(
      screen.getByRole("heading", { level: 4, name: "取り" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 4, name: "投げ" }),
    ).not.toBeInTheDocument();
  });

  it("追加カテゴリ（slug が想定外）は UserCategory.name を直表示する", () => {
    // Arrange
    const categories: UserCategory[] = [
      makeCategory({
        id: "c1",
        slug: "custom-foo",
        name: "オリジナル分類",
        sort_order: 0,
        is_default: false,
      }),
    ];
    const tagStats: TagStatItem[] = [
      makeTag({
        tag_id: "t1",
        tag_name: "x",
        category: "オリジナル分類",
        page_count: 1,
      }),
    ];

    // Act
    render(
      <TagTrendChart
        tagStats={tagStats}
        categories={categories}
        chartType="bar"
      />,
    );

    // Assert
    expect(
      screen.getByRole("heading", { level: 4, name: "オリジナル分類" }),
    ).toBeInTheDocument();
  });

  it("該当カテゴリの tag_stats が無いセクションは描画されない", () => {
    // Arrange
    const categories: UserCategory[] = [
      makeCategory({ id: "c0", slug: "tori", name: "取り", sort_order: 0 }),
      makeCategory({ id: "c1", slug: "uke", name: "受け", sort_order: 1 }),
    ];
    const tagStats: TagStatItem[] = [
      makeTag({
        tag_id: "t1",
        tag_name: "立技",
        category: "取り",
        page_count: 1,
      }),
      // 「受け」カテゴリのタグなし
    ];

    // Act
    render(
      <TagTrendChart
        tagStats={tagStats}
        categories={categories}
        chartType="bar"
      />,
    );

    // Assert
    expect(
      screen.getByRole("heading", { level: 4, name: "取り" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 4, name: "受け" }),
    ).not.toBeInTheDocument();
  });

  it("sort_order で並べ替えた後の配列 index に対応するパレット色が当たる", () => {
    // Arrange: sort_order を意図的にバラつかせ、5 件すべて渡す
    const categories: UserCategory[] = [
      makeCategory({
        id: "c4",
        slug: "kokyu",
        name: "呼吸",
        sort_order: 4,
        is_default: false,
      }),
      makeCategory({ id: "c0", slug: "tori", name: "取り", sort_order: 0 }),
      makeCategory({ id: "c2", slug: "waza", name: "技", sort_order: 2 }),
      makeCategory({
        id: "c3",
        slug: "shisei",
        name: "姿勢",
        sort_order: 3,
        is_default: false,
      }),
      makeCategory({ id: "c1", slug: "uke", name: "受け", sort_order: 1 }),
    ];
    const tagStats: TagStatItem[] = [
      makeTag({
        tag_id: "t0",
        tag_name: "x0",
        category: "取り",
        page_count: 1,
      }),
      makeTag({
        tag_id: "t1",
        tag_name: "x1",
        category: "受け",
        page_count: 1,
      }),
      makeTag({ tag_id: "t2", tag_name: "x2", category: "技", page_count: 1 }),
      makeTag({
        tag_id: "t3",
        tag_name: "x3",
        category: "姿勢",
        page_count: 1,
      }),
      makeTag({
        tag_id: "t4",
        tag_name: "x4",
        category: "呼吸",
        page_count: 1,
      }),
    ];
    const expected = [
      { name: "取り", color: "#3b4b59" }, // index 0
      { name: "受け", color: "#888e7e" }, // index 1
      { name: "技", color: "#b64545" }, // index 2
      { name: "姿勢", color: "#a89253" }, // index 3
      { name: "呼吸", color: "#7a7570" }, // index 4
    ];

    // Act
    render(
      <TagTrendChart
        tagStats={tagStats}
        categories={categories}
        chartType="bar"
      />,
    );

    // Assert
    expected.forEach(({ name, color }) => {
      const heading = screen.getByRole("heading", { level: 4, name });
      expect(heading.style.color.toLowerCase()).toBe(color);
    });
  });
});
