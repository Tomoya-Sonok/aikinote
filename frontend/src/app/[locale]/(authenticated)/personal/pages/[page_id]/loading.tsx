import { Loader } from "@/components/shared/Loader";

// ページ詳細への遷移中、他画面と揃えてシンプルな Loader を中央表示する
export default function Loading() {
  return <Loader size="large" centered />;
}
