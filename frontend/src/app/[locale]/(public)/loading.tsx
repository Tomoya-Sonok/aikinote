// segment loading.tsx は page 内の <Suspense fallback> より外側で動くため、ここで
// 何かを返すと page ごとに用意した専用 Skeleton が上書きされてしまう。null を返して
// page level の fallback に委ねる
export default function PublicLoading() {
  return null;
}
