import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";

export default async function SocialProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  redirect(`/${locale}/social/profile/${user.id}`);
}
