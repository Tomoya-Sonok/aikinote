"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { DateRangeInput } from "@/components/shared/DateRangeInput/DateRangeInput";
import { Skeleton } from "@/components/shared/Skeleton";
import { useTrainingStats } from "@/lib/hooks/useTrainingStats";
import styles from "./page.module.css";

const TagTrendChart = dynamic(
  () =>
    import("@/components/features/personal/StatsChart/TagTrendChart").then(
      (mod) => mod.TagTrendChart,
    ),
  { ssr: false, loading: () => <div className={styles.chartLoading} /> },
);

const MonthlyChart = dynamic(
  () =>
    import("@/components/features/personal/StatsChart/MonthlyChart").then(
      (mod) => mod.MonthlyChart,
    ),
  { ssr: false, loading: () => <div className={styles.chartLoading} /> },
);

type PeriodPreset = "all" | "3m" | "6m" | "1y" | "custom";
type ChartType = "bar" | "pie";

function getPresetDates(preset: PeriodPreset): {
  startDate: string | null;
  endDate: string | null;
} {
  if (preset === "all") return { startDate: null, endDate: null };

  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);
  const start = new Date(now);

  switch (preset) {
    case "3m":
      start.setMonth(start.getMonth() - 3);
      break;
    case "6m":
      start.setMonth(start.getMonth() - 6);
      break;
    case "1y":
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      return { startDate: null, endDate: null };
  }

  return { startDate: start.toISOString().slice(0, 10), endDate };
}

function computeDuration(firstDate: string | null): {
  years: number;
  months: number;
  totalDays: number;
} | null {
  if (!firstDate) return null;

  const start = new Date(firstDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, totalDays };
}

export function PersonalStats() {
  const t = useTranslations("personalStats");

  const [period, setPeriod] = useState<PeriodPreset>("all");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [customStartDate, setCustomStartDate] = useState<string | null>(null);
  const [customEndDate, setCustomEndDate] = useState<string | null>(null);

  const { startDate, endDate } = useMemo(() => {
    if (period === "custom") {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    return getPresetDates(period);
  }, [period, customStartDate, customEndDate]);

  const { loading, error, data } = useTrainingStats({
    startDate,
    endDate,
  });

  const handlePeriodChange = useCallback((preset: PeriodPreset) => {
    setPeriod(preset);
  }, []);

  const duration = useMemo(
    () => computeDuration(data?.first_training_date ?? null),
    [data?.first_training_date],
  );

  const formatDuration = (): string => {
    if (!duration) return "—";
    if (duration.years > 0) {
      return t("durationYearsMonths", {
        years: duration.years,
        months: duration.months,
      });
    }
    return t("durationDays", { days: duration.totalDays });
  };

  if (!loading && error) {
    return (
      <div className={styles.container}>
        <p className={styles.errorText}>{t("dataFetchFailed")}</p>
      </div>
    );
  }

  if (!loading && !data) {
    return (
      <div className={styles.container}>
        <p className={styles.noDataText}>{t("noData")}</p>
      </div>
    );
  }

  const presets: { key: PeriodPreset; label: string }[] = [
    { key: "all", label: t("periodAll") },
    { key: "3m", label: t("period3Months") },
    { key: "6m", label: t("period6Months") },
    { key: "1y", label: t("period1Year") },
    { key: "custom", label: t("periodCustom") },
  ];

  const attendedDays =
    period === "all"
      ? data?.total_attended_days
      : data?.attended_days_in_period;
  const pagesCount =
    period === "all" ? data?.total_pages : data?.pages_in_period;

  return (
    <div className={styles.container}>
      <p className={styles.description}>{t("description")}</p>

      {/* 期間選択 */}
      <div className={styles.periodSection}>
        <span className={styles.periodLabel}>{t("periodLabel")}</span>
        <div className={styles.periodButtons}>
          {presets.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`${styles.periodButton} ${period === key ? styles.periodButtonActive : ""}`}
              onClick={() => handlePeriodChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <DateRangeInput
            startDate={customStartDate}
            endDate={customEndDate}
            onStartDateChange={setCustomStartDate}
            onEndDateChange={setCustomEndDate}
            className={styles.customDateRange}
          />
        )}
      </div>

      {/* サマリーカード群 */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{t("trainingDuration")}</span>
          <span className={styles.summaryValue}>
            {loading ? (
              <Skeleton variant="text" width="64px" height="20px" />
            ) : (
              formatDuration()
            )}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{t("attendedDays")}</span>
          <span className={styles.summaryValue}>
            {loading ? (
              <Skeleton variant="text" width="48px" height="20px" />
            ) : (
              t("attendedDaysCount", { count: attendedDays ?? 0 })
            )}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{t("totalPages")}</span>
          <span className={styles.summaryValue}>
            {loading ? (
              <Skeleton variant="text" width="48px" height="20px" />
            ) : (
              t("totalPagesCount", { count: pagesCount ?? 0 })
            )}
          </span>
        </div>
      </div>

      {/* 月別推移チャート */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>{t("monthlyTrend")}</h3>
        {loading ? (
          <Skeleton
            variant="rect"
            width="100%"
            height="280px"
            borderRadius="8px"
          />
        ) : (
          <MonthlyChart monthlyStats={data?.monthly_stats ?? []} />
        )}
      </div>

      {/* タグ傾向チャート */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>{t("tagTrend")}</h3>
          <div className={styles.chartToggle}>
            <button
              type="button"
              className={`${styles.toggleButton} ${chartType === "bar" ? styles.toggleButtonActive : ""}`}
              onClick={() => setChartType("bar")}
            >
              {t("chartTypeBar")}
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${chartType === "pie" ? styles.toggleButtonActive : ""}`}
              onClick={() => setChartType("pie")}
            >
              {t("chartTypePie")}
            </button>
          </div>
        </div>
        {loading ? (
          <Skeleton
            variant="rect"
            width="100%"
            height="200px"
            borderRadius="8px"
          />
        ) : (data?.tag_stats ?? []).length > 0 ? (
          <TagTrendChart
            tagStats={data?.tag_stats ?? []}
            chartType={chartType}
          />
        ) : (
          <p className={styles.noDataText}>{t("noData")}</p>
        )}
      </div>
    </div>
  );
}
