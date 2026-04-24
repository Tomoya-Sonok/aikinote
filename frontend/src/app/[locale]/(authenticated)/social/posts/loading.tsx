import { Loader } from "@/components/shared/Loader";

// 投稿一覧への遷移中、他画面（マイページ/編集系）と揃えてシンプルな Loader を中央表示する
export default function Loading() {
  return <Loader size="large" centered />;
}
