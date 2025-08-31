import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
	return (
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
	);
}
