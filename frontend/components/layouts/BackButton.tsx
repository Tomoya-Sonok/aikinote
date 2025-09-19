"use client";

import { useRouter } from "next/navigation";
import type { ComponentPropsWithoutRef, MouseEventHandler } from "react";
import styles from "./BackButton.module.css";

interface BackButtonProps extends ComponentPropsWithoutRef<"button"> {
  fallbackHref?: string;
  label?: string;
}

export function BackButton({
  fallbackHref = "/",
  label = "戻る",
  onClick,
  ...rest
}: BackButtonProps) {
  const router = useRouter();

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    event.preventDefault();

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      className={styles.button}
      aria-label={label}
      onClick={handleClick}
      {...rest}
    >
      <span className={styles.icon} aria-hidden="true">
        ←
      </span>
      {label}
    </button>
  );
}
