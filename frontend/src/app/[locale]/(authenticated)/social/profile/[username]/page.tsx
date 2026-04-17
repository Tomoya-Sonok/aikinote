import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import { buildApiUrl, createBackendAuthToken } from "@/lib/server/auth";
import type { ApiResponse } from "@/types/api";
import { SocialProfileView } from "../SocialProfileView";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "socialPosts" });

  return buildMetadata({
    title: t("profileTitle"),
  });
}

const resolveUsernameFromUserId = async (
  userId: string,
): Promise<string | null> => {
  const token = await createBackendAuthToken();
  if (!token) return null;

  const response = await fetch(buildApiUrl(`/api/users/${userId}/username`), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const result: ApiResponse<{ username: string }> = await response
    .json()
    .catch(() => ({ success: false, error: "Invalid JSON response" }));

  if (!result.success || !result.data?.username) return null;
  return result.data.username;
};

export default async function SocialProfileByUsernamePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;

  if (UUID_REGEX.test(username)) {
    const resolvedUsername = await resolveUsernameFromUserId(username);
    if (resolvedUsername) {
      redirect(`/${locale}/social/profile/${resolvedUsername}`);
    }
  }

  return <SocialProfileView username={username} />;
}
