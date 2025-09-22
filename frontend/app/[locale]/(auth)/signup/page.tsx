import type { Metadata } from "next";
import { NotLoggedInLayout } from "@/components/layouts/NotLoggedInLayout";
import { buildMetadata } from "@/lib/metadata";
import { SignUpPageClient } from "./SignUpPageClient";

interface SignupPageProps {
	params: { locale: string };
}

export const metadata: Metadata = buildMetadata({
	title: "新規登録",
	description: "AikiNoteの新規登録ページ",
});

export default function SignUpPage({ params: { locale } }: SignupPageProps) {
	return (
		<NotLoggedInLayout>
			<SignUpPageClient locale={locale} />
		</NotLoggedInLayout>
	);
}
