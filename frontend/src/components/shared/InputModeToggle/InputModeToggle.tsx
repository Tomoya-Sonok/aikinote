"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import type { PageInputMode } from "@/stores/pageInputModeStore";
import styles from "./InputModeToggle.module.css";

interface InputModeToggleProps {
  mode: PageInputMode;
  onChange: (mode: PageInputMode) => void;
}

// #280 「自由入力」と「タグごとに入力」を切り替えるトグル。
// 見た目は投稿作成画面（/social/posts/new）の「投稿」「稽古記録」トグルに揃えている。
export function InputModeToggle({ mode, onChange }: InputModeToggleProps) {
  const t = useTranslations();
  const groupId = useId();

  const options: { value: PageInputMode; label: string }[] = [
    { value: "free", label: t("pageCreate.modeFree") },
    { value: "tag_based", label: t("pageCreate.modeTagBased") },
  ];

  return (
    <>
      <span id={groupId} className={styles.srOnly}>
        {t("pageCreate.inputModeLabel")}
      </span>
      <div
        className={styles.modeSelector}
        role="radiogroup"
        aria-labelledby={groupId}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={`${styles.modeButton} ${mode === option.value ? styles.modeActive : ""}`}
          >
            <input
              type="radio"
              name="pageInputMode"
              value={option.value}
              checked={mode === option.value}
              onChange={() => onChange(option.value)}
              className={styles.modeRadio}
            />
            <span className={styles.modeText}>{option.label}</span>
          </label>
        ))}
      </div>
    </>
  );
}
