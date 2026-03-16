import { MagnifyingGlassIcon, XCircleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import type { ChangeEvent, FC, KeyboardEvent } from "react";
import styles from "./SearchInput.module.css";

interface SearchInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  placeholder?: string;
}

export const SearchInput: FC<SearchInputProps> = ({
  value,
  onChange,
  onKeyDown,
  onClear,
  placeholder,
}) => {
  const t = useTranslations();
  const defaultPlaceholder = placeholder || t("components.searchPlaceholder");
  const showClear = value.length > 0 && onClear;
  return (
    <div className={styles.searchBox}>
      <MagnifyingGlassIcon
        size={14}
        weight="light"
        color="var(--black)"
        className={styles.searchIcon}
      />
      <input
        type="text"
        placeholder={defaultPlaceholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className={`${styles.searchInput} ${showClear ? styles.searchInputWithClear : ""}`}
      />
      {showClear && (
        <button
          type="button"
          className={styles.clearButton}
          onClick={onClear}
          aria-label={t("components.clear")}
        >
          <XCircleIcon size={18} weight="fill" />
        </button>
      )}
    </div>
  );
};
