import type { Viewport } from "next";
import { AiCoachChat } from "@/components/features/personal/AiCoach/AiCoachChat";

// ソフトキーボード展開時にレイアウトビューポートを縮める。
// 結果として 100dvh が「キーボード分を除いた可視高」と一致し、ヘッダーは固定、
// composer のみがキーボードのすぐ上に押し上がる挙動になる（resizes-visual だと
// ページ全体が上スクロールし、ヘッダーや過去チャットが画面外に消える）。
export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
};

export default function AiCoachChatPage() {
  return <AiCoachChat />;
}
