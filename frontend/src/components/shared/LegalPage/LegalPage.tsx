"use client";

import dynamic from "next/dynamic";
import type { FC } from "react";
import remarkGfm from "remark-gfm";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import styles from "./LegalPage.module.css";

const ReactMarkdown = dynamic(() => import("react-markdown"), {
  loading: () => <div className={styles.body} />,
});

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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </article>
    </MinimalLayout>
  );
};
