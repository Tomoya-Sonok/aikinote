import type { Metadata } from "next";
import { GuestGate } from "@/components/shared/auth";
import { NotLoggedInLayout } from "@/components/shared/layouts/NotLoggedInLayout";
import { buildMetadata } from "@/lib/metadata";
import { SignUp } from "./SignUp";

interface SignupPageProps {
  params: Promise<{ locale: string }>;
}

export const metadata: Metadata = buildMetadata({
  title: "新規登録",
  description: "AikiNoteの新規登録ページ",
});

export default async function Page({ params }: SignupPageProps) {
  const { locale } = await params;

  return (
    <GuestGate>
      <NotLoggedInLayout>
        <SignUp locale={locale} />
      </NotLoggedInLayout>
    </GuestGate>
  );
}
