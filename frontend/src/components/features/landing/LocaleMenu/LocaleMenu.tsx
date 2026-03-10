"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./LocaleMenu.module.css";

interface LocaleOption {
  href: string;
  label: string;
  isActive: boolean;
}

interface LocaleMenuProps {
  summary: string;
  options: LocaleOption[];
}

export function LocaleMenu({ summary, options }: LocaleMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={menuRef} className={styles.localeMenu}>
      <button
        type="button"
        className={`${styles.localeSummary} ${isOpen ? styles.localeSummaryOpen : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className={styles.localeSummaryText}>{summary}</span>
        <span
          className={`${styles.localeChevron} ${isOpen ? styles.localeChevronOpen : ""}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div className={styles.localePanel}>
          {options.map((option) => (
            <Link
              key={option.href}
              href={option.href}
              className={`${styles.localeOption} ${
                option.isActive ? styles.localeOptionActive : ""
              }`}
              aria-current={option.isActive ? "page" : undefined}
              onClick={() => setIsOpen(false)}
            >
              {option.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
