interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

// 認証 redirect は各 page の `<AuthGate>` に移譲する。
// layout を passthrough 化することで、cacheComponents 有効化時に
// (authenticated) 配下の static shell が dynamic source 由来で潰れるのを防ぐ
export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  return children;
}
