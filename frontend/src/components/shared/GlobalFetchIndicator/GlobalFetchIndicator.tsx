"use client";

import { useIsFetching } from "@tanstack/react-query";
import styles from "./GlobalFetchIndicator.module.css";

export function GlobalFetchIndicator() {
  const fetchingCount = useIsFetching();
  if (fetchingCount === 0) return null;

  return (
    <div className={styles.container} aria-hidden="true">
      <div className={styles.bar} />
    </div>
  );
}
