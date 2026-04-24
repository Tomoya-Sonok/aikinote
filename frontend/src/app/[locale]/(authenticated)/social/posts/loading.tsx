import { SocialPostCardSkeleton } from "@/components/features/social/SocialPostCard/SocialPostCardSkeleton";

// 投稿一覧への遷移中、ヘッダー／タブナビは親 layout が保持し続けるので、
// loading.tsx 側ではページ本文スケルトンのみ出す（"use client" な Layout を噛ませると
// SSG 時の static export で createContext 初期化エラーになるため避ける）
export default function Loading() {
  return (
    <div style={{ padding: "16px" }}>
      <SocialPostCardSkeleton count={4} />
    </div>
  );
}
