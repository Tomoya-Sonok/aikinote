import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { TagManagementPageClient } from "./TagManagementPageClient";

export default async function TagManagementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return <TagManagementPageClient locale={locale} />;
}
