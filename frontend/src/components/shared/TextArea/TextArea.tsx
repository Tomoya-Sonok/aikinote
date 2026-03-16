import { useTranslations } from "next-intl";
import type { FC, TextareaHTMLAttributes } from "react";
import { useId } from "react";
import { HashtagTextarea } from "@/components/shared/HashtagTextarea/HashtagTextarea";
import styles from "./TextArea.module.css";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  error?: string;
  enableHashtagHighlight?: boolean;
  showCharCount?: boolean;
}

export const TextArea: FC<TextAreaProps> = ({
  label,
  required = false,
  error,
  className,
  enableHashtagHighlight = false,
  showCharCount = false,
  value,
  onChange,
  placeholder,
  maxLength,
  rows,
  ...props
}) => {
  const t = useTranslations();
  const inputId = useId();
  const errorId = useId();

  const currentLength = typeof value === "string" ? value.length : 0;

  return (
    <div className={`${styles.container} ${className || ""}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && (
            <span className={styles.required}>{t("components.required")}</span>
          )}
        </label>
      )}
      {enableHashtagHighlight ? (
        <HashtagTextarea
          value={typeof value === "string" ? value : ""}
          onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows}
          className={`${styles.textarea} ${error ? styles.error : ""}`}
        />
      ) : (
        <textarea
          id={inputId}
          className={`${styles.textarea} ${error ? styles.error : ""}`}
          aria-describedby={error ? errorId : undefined}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows}
          {...props}
        />
      )}
      {showCharCount && maxLength && (
        <span className={styles.charCount}>
          {currentLength}/{maxLength}
        </span>
      )}
      {error && (
        <span id={errorId} className={styles.errorMessage}>
          {error}
        </span>
      )}
    </div>
  );
};
