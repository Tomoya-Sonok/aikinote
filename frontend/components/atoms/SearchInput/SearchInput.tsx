import Image from "next/image";
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
  placeholder = "フリーワードで絞り込む",
}) => {
  return (
    <div className={styles.searchBox}>
      <Image
        src="/icons/search-icon.svg"
        alt="検索"
        width={13}
        height={14}
        className={styles.searchIcon}
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={styles.searchInput}
      />
    </div>
  );
};
