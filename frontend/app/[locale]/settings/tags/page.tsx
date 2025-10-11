import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { TagManagementPageClient } from "./TagManagementPageClient";

export default async function TagManagementPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return <TagManagementPageClient locale={locale} />;
}
