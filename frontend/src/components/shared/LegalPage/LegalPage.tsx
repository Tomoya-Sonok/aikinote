"use client";

import type { FC } from "react";
import ReactMarkdown from "react-markdown";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import styles from "./LegalPage.module.css";

interface LegalPageProps {
  title: string;
  content: string;
  className?: string;
}

export const LegalPage: FC<LegalPageProps> = ({
  title,
  content,
  className = "",
}) => {
  return (
    <MinimalLayout headerTitle={title} backHref="/">
      <article className={`${styles.card} ${className}`}>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.body}>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </article>
    </MinimalLayout>
  );
};
