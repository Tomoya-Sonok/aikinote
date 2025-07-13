import type { Metadata } from "next";
import { Zen_Old_Mincho, Inter } from "next/font/google";
import "./globals.css";

const zenOldMincho = Zen_Old_Mincho({
	weight: "400",
	subsets: ["latin"],
	variable: "--font-zen-old-mincho",
});

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
});

export const metadata: Metadata = {
	title: "AikiNote",
	description: "合気道の練習記録アプリケーション",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="ja">
			<body className={`${zenOldMincho.variable} ${inter.variable}`}>
				<main>{children}</main>
			</body>
		</html>
	);
}
