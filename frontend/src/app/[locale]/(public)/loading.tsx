// 各 page の page.tsx で <Suspense fallback={<XxxSkeleton />}> を定義しているため、
// この segment レベルの loading.tsx では何も表示せず page level の Suspense fallback に
// 表示を委ねる。Next.js の app router では segment loading.tsx が page level の
// Suspense fallback より外側で動き、ここで Loader を返すと専用 Skeleton が
// 上書きされて見えなくなるため null を返す。
// cacheComponents の static shell streaming + page 内 Suspense fallback の組み合わせで
// 各 route の特性に応じた fallback 表示が実現される。
export default function PublicLoading() {
  return null;
}
