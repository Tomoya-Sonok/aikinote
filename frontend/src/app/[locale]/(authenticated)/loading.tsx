import { Loader } from "@/components/shared/Loader";

// page.tsx 解決前の「何も表示されない時間」を埋める。page 解決後は内側の
// <Suspense fallback={<XxxSkeleton />}> が引き継ぐ二段構成。
// 共通 layout で Header / Footer を共有していないため Web 版では navigation 時に
// 全体再描画が起きるが、その間に Loader を出すことでチラつきの体感を抑える。
export default function AuthenticatedLoading() {
  return <Loader size="large" centered />;
}
