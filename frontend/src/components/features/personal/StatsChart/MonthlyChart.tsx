"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyStatItem } from "@/lib/hooks/useTrainingStats";
import styles from "./StatsChart.module.css";

interface MonthlyChartProps {
  monthlyStats: MonthlyStatItem[];
}

export const MonthlyChart: FC<MonthlyChartProps> = ({ monthlyStats }) => {
  const t = useTranslations("personalStats");

  if (monthlyStats.length === 0) {
    return <p className={styles.noData}>{t("noData")}</p>;
  }

  const data = monthlyStats.map((item) => ({
    month: item.month.slice(2),
    [t("pagesCount")]: item.page_count,
    [t("attendedCount")]: item.attended_days,
  }));

  return (
    <div className={styles.chartWrapper}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "var(--black)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--black)" }}
            allowDecimals={false}
          />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey={t("pagesCount")} fill="#595857" radius={[4, 4, 0, 0]} />
          <Bar
            dataKey={t("attendedCount")}
            fill="#AFA8A0"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
