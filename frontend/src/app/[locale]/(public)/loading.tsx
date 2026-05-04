import { Loader } from "@/components/shared/Loader";

// page.tsx 解決前の「何も表示されない時間」を埋める。page 解決後は内側の
// <Suspense fallback={<XxxSkeleton />}> が引き継ぐ二段構成。
export default function PublicLoading() {
  return <Loader size="large" centered />;
}
