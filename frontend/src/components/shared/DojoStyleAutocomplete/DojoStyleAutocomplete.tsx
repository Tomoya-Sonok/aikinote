"use client";

import { CheckCircle, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import {
  type FC,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { searchDojoStyles } from "@/lib/api/client";
import { useDebounce } from "@/lib/hooks/useDebounce";
import styles from "./DojoStyleAutocomplete.module.css";

export interface DojoStyleOption {
  id: string;
  dojo_name: string;
  dojo_name_kana: string | null;
  is_approved: boolean;
}

interface DojoStyleAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (dojoStyle: DojoStyleOption) => void;
  onRegisterNew?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  selectedId?: string | null;
  onClear?: () => void;
}

export const DojoStyleAutocomplete: FC<DojoStyleAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  onRegisterNew,
  placeholder = "",
  disabled = false,
  selectedId,
  onClear,
}) => {
  const t = useTranslations();
  const [suggestions, setSuggestions] = useState<DojoStyleOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const debouncedValue = useDebounce(value, 300);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchDojoStyles({
        query,
        limit: 10,
      });

      if (result.success && result.data) {
        setSuggestions(result.data);
        setIsOpen(result.data.length > 0 || query.length > 0);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId && debouncedValue) {
      fetchSuggestions(debouncedValue);
    }
  }, [debouncedValue, fetchSuggestions, selectedId]);

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: DojoStyleOption) => {
    onSelect(option);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleRegisterNew = () => {
    if (onRegisterNew && value.trim()) {
      onRegisterNew(value.trim());
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const showRegisterNew =
    onRegisterNew &&
    value.trim().length > 0 &&
    !suggestions.some((s) => s.dojo_name === value.trim());

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    const totalItems = suggestions.length + (showRegisterNew ? 1 : 0);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex]);
        } else if (activeIndex === suggestions.length && showRegisterNew) {
          handleRegisterNew();
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // 選択済み状態
  if (selectedId && value) {
    return (
      <div className={styles.selectedContainer}>
        <span className={styles.selectedText}>{value}</span>
        {onClear && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={onClear}
            aria-label="クリア"
          >
            <X size={16} weight="bold" color="var(--text-light)" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0 || value.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={styles.input}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
      />

      {isOpen && (
        <div className={styles.dropdown} ref={listRef} role="listbox">
          {isSearching && (
            <div className={styles.loadingItem}>
              {t("userInfoEdit.loading")}
            </div>
          )}

          {suggestions.map((option, index) => (
            <div
              key={option.id}
              className={`${styles.suggestionItem} ${index === activeIndex ? styles.active : ""}`}
              onClick={() => handleSelect(option)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSelect(option);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
              tabIndex={0}
              aria-selected={index === activeIndex}
            >
              <div className={styles.suggestionContent}>
                <span className={styles.suggestionName}>
                  {option.dojo_name}
                </span>
              </div>
              {option.is_approved && (
                <span className={styles.approvedBadge}>
                  <CheckCircle
                    size={14}
                    weight="fill"
                    color="var(--success-color)"
                  />
                  <span className={styles.approvedText}>
                    {t("userInfoEdit.approved")}
                  </span>
                </span>
              )}
            </div>
          ))}

          {showRegisterNew && (
            <div
              className={`${styles.registerItem} ${activeIndex === suggestions.length ? styles.active : ""}`}
              onClick={handleRegisterNew}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRegisterNew();
              }}
              onMouseEnter={() => setActiveIndex(suggestions.length)}
              role="option"
              tabIndex={0}
              aria-selected={activeIndex === suggestions.length}
            >
              {t("userInfoEdit.registerNewDojo", { query: value.trim() })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
