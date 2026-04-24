import { TrainingCardSkeleton } from "@/components/features/personal/TrainingCard/TrainingCardSkeleton";
import { DefaultLayout } from "@/components/shared/layouts/DefaultLayout";

// ページ一覧 → 詳細 への遷移時、Header/Footer を保ったままスケルトンを見せることで
// 画面が一瞬真っ白になる違和感を抑える
export default function Loading() {
  return (
    <DefaultLayout>
      <div style={{ padding: "16px" }}>
        <TrainingCardSkeleton count={1} />
      </div>
    </DefaultLayout>
  );
}
