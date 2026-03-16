import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import type { ChangeEvent, FC, KeyboardEvent } from "react";
import styles from "./SearchInput.module.css";

interface SearchInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export const SearchInput: FC<SearchInputProps> = ({
  value,
  onChange,
  onKeyDown,
  placeholder,
}) => {
  const t = useTranslations();
  const defaultPlaceholder = placeholder || t("components.searchPlaceholder");
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
        className={styles.searchInput}
      />
    </div>
  );
};
