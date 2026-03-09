"use client";

import { useTranslations } from "next-intl";
import { type FC, useId } from "react";
import styles from "./DateRangeInput.module.css";

export interface DateRangeInputProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
  className?: string;
}

export const DateRangeInput: FC<DateRangeInputProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className = "",
}) => {
  const t = useTranslations("personalStats");
  const id = useId();
  const startId = `${id}-start`;
  const endId = `${id}-end`;

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={startId}>
          {t("startDate")}
        </label>
        <input
          id={startId}
          type="date"
          className={styles.input}
          value={startDate ?? ""}
          onChange={(e) => onStartDateChange(e.target.value || null)}
        />
      </div>
      <span className={styles.separator}>〜</span>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={endId}>
          {t("endDate")}
        </label>
        <input
          id={endId}
          type="date"
          className={styles.input}
          value={endDate ?? ""}
          onChange={(e) => onEndDateChange(e.target.value || null)}
        />
      </div>
    </div>
  );
};
