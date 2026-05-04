import { redirect } from "next/navigation";
import { buildApiUrl } from "@/lib/server/auth";
import type { ApiResponse } from "@/types/api";
import { SocialProfileView } from "../SocialProfileView";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const resolveUsernameFromUserId = async (
  userId: string,
): Promise<string | null> => {
  const response = await fetch(buildApiUrl(`/api/users/${userId}/username`), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) return null;

  const result: ApiResponse<{ username: string }> = await response
    .json()
    .catch(() => ({ success: false, error: "Invalid JSON response" }));

  if (!result.success || !result.data?.username) return null;
  return result.data.username;
};

interface ProfileResolverProps {
  locale: string;
  username: string;
}

export async function ProfileResolver({
  locale,
  username,
}: ProfileResolverProps) {
  if (UUID_REGEX.test(username)) {
    const resolvedUsername = await resolveUsernameFromUserId(username);
    if (resolvedUsername) {
      redirect(`/${locale}/social/profile/${resolvedUsername}`);
    }
  }

  return <SocialProfileView username={username} />;
}
