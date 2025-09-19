import Link from "next/link";
import { NotLoggedInLayout } from "@/components/layouts/NotLoggedInLayout";
import { buildMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

export const metadata = buildMetadata({
  title: "AikiNote",
  description: "合気道の稽古を記録し、共有するアプリケーション",
});

export default function Home() {
  return (
    <NotLoggedInLayout showHeader={false} showFooter={false} showTabNavigation={false}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>AikiNote</h1>
          <p className={styles.subtitle}>
            合気道の稽古を記録し、共有するアプリケーション
          </p>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>稽古の記録を始めましょう</h2>
            <div className={styles.buttonContainer}>
              <Link href="/personal/pages" className={styles.startButton}>
                AikiNoteを使ってみる
              </Link>
            </div>
          </section>
        </main>
        <footer className={styles.footer}>
          <p>© 2025 AikiNote</p>
        </footer>
      </div>
    </NotLoggedInLayout>
  );
}
