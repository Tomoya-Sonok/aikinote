// (tabbed)/(default-header)/layout 等の共通 layout が Header / TabNavigation を保持し
// navigation 時に維持されるため、segment loading.tsx は何も表示せず page level の
// <Suspense fallback> に委ねる
export default function AuthenticatedLoading() {
  return null;
}
