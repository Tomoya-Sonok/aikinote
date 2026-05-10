import { MagnifyingGlassIcon, XCircleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import {
  type ChangeEvent,
  type FC,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
} from "react";
import styles from "./SearchInput.module.css";

interface SearchInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  /**
   * 確定操作（Enter / ソフトキーボード「検索」ボタン / form submit）で発火。
   * IME 変換確定中は呼ばれない。
   */
  onSubmit?: (value: string) => void;
  /** 後方互換のために残置。新規実装は onSubmit を使うこと。 */
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  placeholder?: string;
}

export const SearchInput: FC<SearchInputProps> = ({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  onClear,
  placeholder,
}) => {
  const t = useTranslations();
  const defaultPlaceholder = placeholder || t("components.searchPlaceholder");
  const showClear = value.length > 0 && onClear;

  const handleFormSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onSubmit?.(value);
    },
    [onSubmit, value],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      // IME 変換確定中の Enter は form の暗黙 submit を抑止
      if (
        e.key === "Enter" &&
        (e.nativeEvent.isComposing || e.keyCode === 229)
      ) {
        e.preventDefault();
        return;
      }
      onKeyDown?.(e);
    },
    [onKeyDown],
  );

  return (
    // biome-ignore lint/a11y/useSemanticElements: <search> 要素で <form> を包むと flex レイアウト再構築が必要なため、role 属性で代替
    <form
      className={styles.searchBox}
      onSubmit={handleFormSubmit}
      role="search"
      action="#"
    >
      <MagnifyingGlassIcon
        size={14}
        weight="light"
        color="var(--black)"
        className={styles.searchIcon}
      />
      <input
        type="search"
        placeholder={defaultPlaceholder}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
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
    </form>
  );
};
