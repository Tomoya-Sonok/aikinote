import { useTranslations } from "next-intl";
import type { SelectHTMLAttributes } from "react";
import { forwardRef, useId } from "react";
import styles from "./SelectInput.module.css";

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ label, required = false, error, className, children, ...props }, ref) => {
    const t = useTranslations();
    const selectId = useId();
    const errorId = useId();

    return (
      <div className={`${styles.container} ${className || ""}`}>
        {label && (
          <label htmlFor={selectId} className={styles.label}>
            {label}
            {required && (
              <span className={styles.required}>
                {t("components.required")}
              </span>
            )}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`${styles.select} ${error ? styles.error : ""}`}
          aria-describedby={error ? errorId : undefined}
          {...props}
        >
          {children}
        </select>
        {error && (
          <span id={errorId} className={styles.errorMessage}>
            {error}
          </span>
        )}
      </div>
    );
  },
);

SelectInput.displayName = "SelectInput";
