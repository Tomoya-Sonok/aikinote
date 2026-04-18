"use client";

import { useTranslations } from "next-intl";
import { type FC, useMemo } from "react";
import type { PieLabelRenderProps } from "recharts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TagStatItem } from "@/lib/hooks/useTrainingStats";
import type { UserCategory } from "@/types/category";
import styles from "./StatsChart.module.css";

const MAX_TAGS = 5;
const PIE_LABEL_MAX_LEN = 6;

function renderPieLabel(props: PieLabelRenderProps) {
  const { x, y, name, percent, textAnchor } = props;
  const n = String(name ?? "");
  const displayName =
    n.length > PIE_LABEL_MAX_LEN ? `${n.slice(0, PIE_LABEL_MAX_LEN)}…` : n;
  return (
    <text
      x={Number(x)}
      y={Number(y)}
      textAnchor={textAnchor}
      dominantBaseline="central"
      fontSize={11}
      fill="var(--black)"
    >
      {`${displayName} ${((Number(percent) || 0) * 100).toFixed(0)}%`}
    </text>
  );
}

// sort_order index で引くカラーパレット。最大5カテゴリ分。
// 既存3カテゴリ（取り/受け/技）の色は互換のため index 0/1/2 で値据え置き。
// index 3/4 はくすんだ古色トーンを踏襲した黄系・グレージュ系を新規追加（ユーザー微調整前提のたたき）。
const CATEGORY_PALETTE: { base: string; shades: string[] }[] = [
  {
    base: "#3B4B59",
    shades: ["#3B4B59", "#4D5E6E", "#5F7183", "#718498", "#8397AD", "#95AAB2"],
  },
  {
    base: "#888E7E",
    shades: ["#888E7E", "#949A8C", "#A0A69A", "#ACB2A8", "#B8BEB6", "#C4CAC4"],
  },
  {
    base: "#B64545",
    shades: ["#B46262", "#B87070", "#B97F7F", "#C48E8E", "#D49898", "#E0A3A3"],
  },
  {
    base: "#A89253",
    shades: ["#A89253", "#B49E62", "#BFAA73", "#C9B585", "#D2C098", "#DACAAC"],
  },
  {
    base: "#7A7570",
    shades: ["#7A7570", "#8A8580", "#9A9590", "#AAA59F", "#BAB5AF", "#CAC5BF"],
  },
];

const FALLBACK_PALETTE = CATEGORY_PALETTE[CATEGORY_PALETTE.length - 1];

export function paletteFor(index: number) {
  return CATEGORY_PALETTE[index] ?? FALLBACK_PALETTE;
}

// 初期3カテゴリ（is_default）の slug → 翻訳キー対応。
// slug は update API で変更されない（name のみ更新）ため、
// ユーザーがリネームしても英語UIでは "Tori/Uke/Waza" の翻訳を維持できる。
const SLUG_TO_TRANSLATION_KEY = {
  tori: "categoryTori",
  uke: "categoryUke",
  waza: "categoryWaza",
} as const satisfies Record<
  string,
  "categoryTori" | "categoryUke" | "categoryWaza"
>;

type DefaultSlug = keyof typeof SLUG_TO_TRANSLATION_KEY;

function isDefaultSlug(slug: string): slug is DefaultSlug {
  return slug in SLUG_TO_TRANSLATION_KEY;
}

interface TagTrendChartProps {
  tagStats: TagStatItem[];
  categories: UserCategory[];
  chartType: "bar" | "pie";
}

interface ChartEntry {
  name: string;
  value: number;
  color: string;
}

export function prepareChartData(
  tags: TagStatItem[],
  categoryName: string,
  shades: string[],
  othersLabel: string,
): ChartEntry[] {
  const filtered = tags
    .filter((t) => t.category === categoryName)
    .sort((a, b) => b.page_count - a.page_count);

  const top = filtered.slice(0, MAX_TAGS);
  const rest = filtered.slice(MAX_TAGS);

  const entries: ChartEntry[] = top.map((t, i) => ({
    name: t.tag_name,
    value: t.page_count,
    color: shades[i] ?? shades[shades.length - 1],
  }));

  if (rest.length > 0) {
    const othersCount = rest.reduce((sum, t) => sum + t.page_count, 0);
    entries.push({
      name: othersLabel,
      value: othersCount,
      color: shades[MAX_TAGS] ?? shades[shades.length - 1],
    });
  }

  return entries;
}

export const TagTrendChart: FC<TagTrendChartProps> = ({
  tagStats,
  categories,
  chartType,
}) => {
  const t = useTranslations("personalStats");

  const sections = useMemo(() => {
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    return sorted.map((category, idx) => {
      const palette = paletteFor(idx);
      return {
        category,
        titleColor: palette.base,
        data: prepareChartData(
          tagStats,
          category.name,
          palette.shades,
          t("others"),
        ),
      };
    });
  }, [tagStats, categories, t]);

  return (
    <div className={styles.tagTrendContainer}>
      {sections.map(({ category, titleColor, data }) => {
        if (data.length === 0) return null;

        const title = isDefaultSlug(category.slug)
          ? t(SLUG_TO_TRANSLATION_KEY[category.slug])
          : category.name;

        return (
          <div key={category.id} className={styles.categorySection}>
            <h4 className={styles.categoryTitle} style={{ color: titleColor }}>
              {title}
            </h4>
            <div className={styles.chartWrapper}>
              {chartType === "bar" ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-color)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: "var(--black)" }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={{ fontSize: 12, fill: "var(--black)" }}
                    />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {data.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={renderPieLabel}
                      labelLine={false}
                    >
                      {data.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
