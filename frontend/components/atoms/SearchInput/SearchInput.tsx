import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ChangeEvent, FC } from "react";
import styles from "./SearchInput.module.css";

interface SearchInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export const SearchInput: FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder,
}) => {
  const t = useTranslations();
  const defaultPlaceholder = placeholder || t("components.searchPlaceholder");
  return (
    <div className={styles.searchBox}>
      <Image
        src="/icons/search-icon.svg"
        alt={t("components.searchIcon")}
        width={13}
        height={14}
        className={styles.searchIcon}
      />
      <input
        type="text"
        placeholder={defaultPlaceholder}
        value={value}
        onChange={onChange}
        className={styles.searchInput}
      />
    </div>
  );
};
