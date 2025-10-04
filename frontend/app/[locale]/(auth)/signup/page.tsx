import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotLoggedInLayout } from "@/components/layouts/NotLoggedInLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import { SignUpPageClient } from "./SignUpPageClient";

interface SignupPageProps {
  params: { locale: string };
}

export const metadata: Metadata = buildMetadata({
  title: "新規登録",
  description: "AikiNoteの新規登録ページ",
});

export default async function SignUpPage({
  params: { locale },
}: SignupPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect(`/${locale}/personal/pages`);
  }

  return (
    <NotLoggedInLayout>
      <SignUpPageClient locale={locale} />
    </NotLoggedInLayout>
  );
}
