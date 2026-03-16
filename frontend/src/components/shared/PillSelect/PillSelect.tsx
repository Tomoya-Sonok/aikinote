"use client";

import type { ReactNode } from "react";
import styles from "./PillSelect.module.css";

export interface PillOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface PillSelectProps<T extends string> {
  options: PillOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  groupLabelId?: string;
  className?: string;
}

export function PillSelect<T extends string>({
  options,
  value,
  onChange,
  groupLabelId,
  className = "",
}: PillSelectProps<T>) {
  return (
    <div
      className={`${styles.group} ${className}`}
      role="radiogroup"
      aria-labelledby={groupLabelId}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`${styles.pill} ${isSelected ? styles.selected : ""}`}
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
