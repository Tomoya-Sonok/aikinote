import { Loader } from "@/components/shared/Loader";
import { ChatLayout } from "@/components/shared/layouts/ChatLayout";

// 投稿一覧 → 詳細 への遷移中も ChatLayout（フッター固定）を保ち、レイアウト揺れを防ぐ
export default function Loading() {
  return (
    <ChatLayout>
      <div style={{ padding: "24px 0" }}>
        <Loader size="large" centered />
      </div>
    </ChatLayout>
  );
}
