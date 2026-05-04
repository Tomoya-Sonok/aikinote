// 認証 redirect は各 page で <AuthGate> に委譲。layout 自体に cookies() 依存を持たせ
// ないことで、cacheComponents 有効時も (authenticated) 配下の static shell が取れる
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
