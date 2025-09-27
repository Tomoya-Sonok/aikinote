import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/server/auth";

interface RootPageProps {
	params: { locale: string };
}

export default async function RootPage({ params: { locale } }: RootPageProps) {
	// 認証状態をチェック
	const user = await getCurrentUser();

	// ログイン済みの場合は練習記録ページにリダイレクト
	if (user) {
		redirect(`/${locale}/personal/pages`);
	}

	const t = await getTranslations({ locale, namespace: "landing" });
	const title = t("title");
	const description = t("description");
	const headline = t("headline");
	const loginText = t("login");
	const signupText = t("signup");

	// 未認証の場合はランディングページを表示
	return (
		<div
			style={{
				minHeight: "100vh",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "20px",
			}}
		>
			<header style={{ textAlign: "center", marginBottom: "40px" }}>
				<h1 style={{ fontSize: "3rem", marginBottom: "16px" }}>{title}</h1>
				<p
					style={{
						fontSize: "1.2rem",
						color: "var(--aikinote-text-secondary)",
					}}
				>
					{description}
				</p>
			</header>

			<main style={{ textAlign: "center" }}>
				<section style={{ marginBottom: "32px" }}>
					<h2 style={{ marginBottom: "16px" }}>{headline}</h2>
					<div
						style={{ display: "flex", gap: "16px", justifyContent: "center" }}
					>
						<Link
							href={`/${locale}/login`}
							style={{
								padding: "12px 24px",
								backgroundColor: "var(--aikinote-primary)",
								color: "white",
								borderRadius: "8px",
								textDecoration: "none",
							}}
						>
							{loginText}
						</Link>
						<Link
							href={`/${locale}/signup`}
							style={{
								padding: "12px 24px",
								border: "2px solid var(--aikinote-primary)",
								color: "var(--aikinote-primary)",
								borderRadius: "8px",
								textDecoration: "none",
							}}
						>
							{signupText}
						</Link>
					</div>
				</section>
			</main>

			<footer style={{ marginTop: "auto", paddingTop: "40px" }}>
				<p
					style={{
						color: "var(--aikinote-text-secondary)",
						fontSize: "0.9rem",
					}}
				>
					© 2025 AikiNote
				</p>
			</footer>
		</div>
	);
}
