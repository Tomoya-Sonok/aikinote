import { useTranslations } from "next-intl";
import { type FontSize, getFontSizeValue } from "@/stores/fontSizeStore";
import styles from "../Tutorial.module.css";

const FONT_SIZE_OPTIONS: { key: FontSize; charSize: number }[] = [
  { key: "small", charSize: 18 },
  { key: "medium", charSize: 24 },
  { key: "large", charSize: 30 },
];

interface StepFontSizeProps {
  fontSize: FontSize;
  onFontSizeChange: (size: FontSize) => void;
}

export function StepFontSize({
  fontSize,
  onFontSizeChange,
}: StepFontSizeProps) {
  const t = useTranslations("tutorial.fontSize");
  const previewPx = getFontSizeValue(fontSize);

  return (
    <div className={styles.stepCenter}>
      <h2 className={`${styles.fontSizeHeading} ${styles.fadeInUpA}`}>
        {t("heading")}
      </h2>
      <p className={`${styles.fontSizeDescription} ${styles.fadeInUpE}`}>
        {t("description")}
      </p>
      <div className={`${styles.fontSizeButtons} ${styles.fadeInUpG}`}>
        {FONT_SIZE_OPTIONS.map(({ key, charSize }) => {
          const isActive = fontSize === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onFontSizeChange(key)}
              className={`${styles.fontSizeButton} ${isActive ? styles.fontSizeButtonActive : ""}`}
            >
              <span
                className={`${styles.fontSizeChar} ${isActive ? styles.fontSizeCharActive : ""}`}
                style={{ fontSize: charSize }}
              >
                あ
              </span>
              <span
                className={`${styles.fontSizeLabel} ${isActive ? styles.fontSizeLabelActive : ""}`}
              >
                {t(key)}
              </span>
            </button>
          );
        })}
      </div>
      <div className={`${styles.previewCard} ${styles.fadeInUpH}`}>
        <p className={styles.previewLabel}>{t("preview")}</p>
        <p className={styles.previewText} style={{ fontSize: previewPx }}>
          {t("previewText")}
        </p>
      </div>
    </div>
  );
}
