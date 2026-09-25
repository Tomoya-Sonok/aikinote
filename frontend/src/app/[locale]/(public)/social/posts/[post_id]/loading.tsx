import { SocialPostCardSkeleton } from "@/components/features/social/SocialPostCard/SocialPostCardSkeleton";
import { ChatLayout } from "@/components/shared/layouts/ChatLayout";

// 投稿一覧 → 詳細 への遷移中も ChatLayout（フッター固定）を保ち、レイアウト揺れを防ぐ。
// 全画面スピナーではなく投稿カードの形のスケルトンを出し、待ち時間を短く感じさせる
export default function Loading() {
  return (
    <ChatLayout>
      <SocialPostCardSkeleton />
    </ChatLayout>
  );
}
