import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "AikiNote",
	description: "合気道の稽古記録アプリ",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="ja" suppressHydrationWarning>
			<body>{children}</body>
		</html>
	);
}
