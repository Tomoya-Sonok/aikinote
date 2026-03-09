"use client";

import { useTranslations } from "next-intl";
import { type FC, useMemo } from "react";
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
import styles from "./StatsChart.module.css";

const MAX_TAGS = 5;

const CATEGORY_COLORS: Record<string, string> = {
  取り: "#3B4B59",
  受け: "#888E7E",
  技: "#b64545ff",
};

const TAG_SHADES: Record<string, string[]> = {
  取り: ["#3B4B59", "#4D5E6E", "#5F7183", "#718498", "#8397AD", "#95AAB2"],
  受け: ["#888E7E", "#949A8C", "#A0A69A", "#ACB2A8", "#B8BEB6", "#C4CAC4"],
  技: [
    "#b46262ff",
    "#b87070ff",
    "#b97f7fff",
    "#c48e8eff",
    "#d49898ff",
    "#e0a3a3ff",
  ],
};

interface TagTrendChartProps {
  tagStats: TagStatItem[];
  chartType: "bar" | "pie";
}

interface ChartEntry {
  name: string;
  value: number;
  color: string;
}

function prepareChartData(
  tags: TagStatItem[],
  category: string,
  othersLabel: string,
): ChartEntry[] {
  const filtered = tags
    .filter((t) => t.category === category)
    .sort((a, b) => b.page_count - a.page_count);

  const shades = TAG_SHADES[category] ?? TAG_SHADES["取り"];
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

const CATEGORIES = ["取り", "受け", "技"] as const;
const CATEGORY_KEYS: Record<string, string> = {
  取り: "categoryTori",
  受け: "categoryUke",
  技: "categoryWaza",
};

export const TagTrendChart: FC<TagTrendChartProps> = ({
  tagStats,
  chartType,
}) => {
  const t = useTranslations("personalStats");

  const dataByCategory = useMemo(() => {
    const result: Record<string, ChartEntry[]> = {};
    for (const cat of CATEGORIES) {
      result[cat] = prepareChartData(tagStats, cat, t("others"));
    }
    return result;
  }, [tagStats, t]);

  return (
    <div className={styles.tagTrendContainer}>
      {CATEGORIES.map((category) => {
        const data = dataByCategory[category];
        if (!data || data.length === 0) return null;

        return (
          <div key={category} className={styles.categorySection}>
            <h4
              className={styles.categoryTitle}
              style={{ color: CATEGORY_COLORS[category] }}
            >
              {t(CATEGORY_KEYS[category] as "categoryTori")}
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
                      tick={{ fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={{ fontSize: 12 }}
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
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
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
