"use client";

import * as Slider from "@radix-ui/react-slider";
import { useTranslations } from "next-intl";
import { type FC, useId } from "react";
import { TrainingCard } from "@/components/features/personal/TrainingCard/TrainingCard";
import { Button } from "@/components/shared/Button/Button";
import {
  type FontSize,
  fontSizeToIndex,
  indexToFontSize,
  useFontSizeStore,
} from "@/stores/fontSizeStore";
import styles from "./FontSizeSetting.module.css";

interface FontSizeSettingProps {
  onSave?: () => void;
}

export const FontSizeSetting: FC<FontSizeSettingProps> = ({ onSave }) => {
  const { fontSize, setFontSize } = useFontSizeStore();
  const t = useTranslations();
  const uniqueId = useId();

  const handleSliderChange = (value: number[]) => {
    const newFontSize = indexToFontSize(value[0]);
    setFontSize(newFontSize);
  };

  const handleLabelClick = (targetFontSize: FontSize) => {
    setFontSize(targetFontSize);
  };

  const fontSizes: FontSize[] = ["small", "medium", "large"];

  const getFontSizeLabel = (fontSize: FontSize): string => {
    return t(`fontSize.${fontSize}`);
  };

  // プレビュー用に固定の日付文字列を作成（ハイドレーションエラー防止）
  const dummyDate = "2024-01-01";

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <p className={styles.description}>{t("fontSize.description")}</p>
      </div>

      <div className={styles.settingArea}>
        {/* プレビュー */}
        <div className={styles.preview} data-font-size={fontSize}>
          <TrainingCard
            id={uniqueId}
            title="合気道の練習記録"
            content={t("fontSize.previewText")}
            date={dummyDate}
            tags={["基本動作", "半身"]}
          />
        </div>

        <div className={styles.stickyBottom}>
          {/* スライダー */}
          <div className={styles.sliderContainer}>
            <Slider.Root
              className={styles.sliderRoot}
              value={[fontSizeToIndex(fontSize)]}
              onValueChange={handleSliderChange}
              max={2}
              min={0}
              step={1}
            >
              <Slider.Track className={styles.sliderTrack}>
                <Slider.Range className={styles.sliderRange} />
              </Slider.Track>
              <Slider.Thumb
                className={styles.sliderThumb}
                aria-label={t("fontSize.title")}
              />
            </Slider.Root>

            <div className={styles.labels}>
              {fontSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`${styles.label} ${
                    fontSize === size ? styles.labelActive : ""
                  }`}
                  onClick={() => handleLabelClick(size)}
                >
                  {getFontSizeLabel(size)}
                </button>
              ))}
            </div>
          </div>

          {onSave && (
            <div className={styles.actions}>
              <Button variant="primary" onClick={onSave}>
                {t("fontSize.saveButton")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
