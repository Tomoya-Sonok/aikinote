import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotLoggedInLayout } from "@/components/layouts/NotLoggedInLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import { SignUpPage } from "./SignUpPage";

interface SignupPageProps {
  params: Promise<{ locale: string }>;
}

export const metadata: Metadata = buildMetadata({
  title: "新規登録",
  description: "AikiNoteの新規登録ページ",
});

export default async function Page({ params }: SignupPageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (user) {
    redirect(`/${locale}/personal/pages`);
  }

  return (
    <NotLoggedInLayout>
      <SignUpPage locale={locale} />
    </NotLoggedInLayout>
  );
}
