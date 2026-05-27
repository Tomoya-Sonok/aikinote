"use client";

import { useTranslations } from "next-intl";
import type { PageInputMode } from "@/stores/pageInputModeStore";
import styles from "./InputModeToggle.module.css";

interface InputModeToggleProps {
  mode: PageInputMode;
  onChange: (mode: PageInputMode) => void;
}

// #280 「自由入力」と「タグごとにメモ」を切り替えるセグメントトグル
export function InputModeToggle({ mode, onChange }: InputModeToggleProps) {
  const t = useTranslations();

  const options: { value: PageInputMode; label: string }[] = [
    { value: "free", label: t("pageCreate.modeFree") },
    { value: "tag_based", label: t("pageCreate.modeTagBased") },
  ];

  return (
    // biome-ignore lint/a11y/useSemanticElements: fieldset だとデフォルト枠線やレイアウトの調整が増えるため、role="group" で軽量に表現する
    <div
      className={styles.toggle}
      role="group"
      aria-label={t("pageCreate.inputModeLabel")}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.option} ${mode === option.value ? styles.active : ""}`}
          aria-pressed={mode === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
