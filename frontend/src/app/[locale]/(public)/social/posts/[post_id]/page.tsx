import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import { SocialPostDetail } from "./SocialPostDetail";

const HONO_API_BASE_URL =
  process.env.NEXT_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8787";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; post_id: string }>;
}): Promise<Metadata> {
  const { locale, post_id } = await params;
  const t = await getTranslations({ locale, namespace: "socialPosts" });

  try {
    const res = await fetch(
      `${HONO_API_BASE_URL}/api/social/posts/public/${post_id}`,
      { cache: "no-store" },
    );
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data?.post?.content) {
        const content: string = json.data.post.content;
        const snippet =
          content.length > 15 ? `${content.slice(0, 15)}...` : content;
        return buildMetadata({
          title: t("detail"),
          openGraphDescription: snippet,
        });
      }
    }
  } catch {
    // API取得失敗時は静的メタデータにフォールバック
  }

  return buildMetadata({
    title: t("detail"),
  });
}

export default async function SocialPostDetailPage({
  params,
}: {
  params: Promise<{ post_id: string }>;
}) {
  const { post_id } = await params;
  return <SocialPostDetail postId={post_id} />;
}
