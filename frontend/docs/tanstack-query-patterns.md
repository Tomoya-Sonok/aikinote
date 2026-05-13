# TanStack Query 採用パターン早見表

AikiNote Web で TanStack Query (React Query) v5 を使う際の判断基準と実装パターンをまとめたものです。新規実装・既存改修時はこのドキュメントを参照してください。

## 1. データ取得 API の選び分け

| API | 用途 | 主な使用例 |
|---|---|---|
| `useQuery` | 単発の取得・enabled で条件制御 | 認証済みユーザー情報、設定、単一エンティティ取得 |
| `useInfiniteQuery` | ページ送り・無限スクロール・タブ切替で page 蓄積 | 投稿フィード、稽古ノート一覧、通知、検索結果 |
| `useMutation` | サーバ更新（POST/PATCH/DELETE）+ 楽観的更新 | 投稿作成、削除、編集、いいね、フォロー |

## 2. Query Key Factory パターン（必須）

**ルール**: 各 hook ファイルで queryKey を生成する関数を `as const` 付きで `export` し、複数箇所からの参照に対応する。

```ts
export const socialFeedQueryKey = (
  userId: string | undefined,
  tab: SocialTab,
) => ["social-feed", userId, tab] as const;
```

**理由**:
- キャッシュ無効化（`queryClient.invalidateQueries({ queryKey: socialFeedQueryKey(...) })`）で型安全性が得られる
- 別ファイルからの cross-cache 操作（`setQueryData`, `setQueriesData`）が可能になる
- キー構造変更時の影響範囲が hook ファイルに局所化される

## 3. 楽観的更新の方針：`useOptimistic` と `setQueryData` の使い分け

### `useOptimistic` (React 19) を使う条件
- **単一画面・単一 component で完結する**操作
- form action / `startTransition` 内で `addOptimistic` を呼べる構造
- 例: 詳細画面内の reply 編集（`SocialPostDetail.tsx`）

```tsx
const [optimisticReplies, addOptimisticReply] = useOptimistic(
  detail?.replies ?? [],
  (state, edit: { id: string; content: string }) =>
    state.map((r) => (r.id === edit.id ? { ...r, content: edit.content } : r)),
);
const [, startReplyEditTransition] = useTransition();

const handleEdit = (replyId, newContent) => {
  startReplyEditTransition(async () => {
    addOptimisticReply({ id: replyId, content: newContent });
    await updateReply(...);
    setRealState(...);
  });
};
```

**メリット**: transition 終了時に自動ロールバック、宣言的、コードが短い
**注意**: `addOptimistic` は transition 内でのみ有効。外で呼ぶとエラー

### `setQueryData` を使う条件（`useOptimistic` を使わない）
- **複数キャッシュ横断**での更新が必要（例: フィード 3 タブ + 検索結果 + 詳細を同時更新）
- `useMutation` の `onMutate` / `onError` / `onSettled` でロールバック制御が必要
- persist client (localStorage) の整合性を直接保ちたい

例: いいねトグル (`useSocialFavorite.ts`)、稽古ノート削除 (`useTrainingPagesData.ts`)、投稿フィード `updatePost` (`useSocialFeed.ts`)

```tsx
queryClient.setQueriesData<InfiniteData<SocialFeedPage>>(
  { queryKey: socialFeedQueryKey(user?.id, t) },
  (old) =>
    old
      ? {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((p) =>
              p.id === postId ? updater(p) : p,
            ),
          })),
        }
      : old,
);
```

**判断フロー**:
```
楽観的更新が必要？
├─ Yes
│   ├─ 1 component / 1 cache で完結する？
│   │   ├─ Yes → useOptimistic を使う
│   │   └─ No → setQueryData / setQueriesData を使う
│   └─ persist 対象キーの整合を保ちたい？ → setQueryData を使う
└─ No → 通常の useMutation + invalidateQueries
```

## 4. `select` オプションの活用

**ルール**: `useInfiniteQuery` で `data.pages.flatMap(...)` のような派生データが必要な場合、外側の `useMemo` ではなく `select` オプションを使う。

```ts
const query = useInfiniteQuery<TPage, Error, FlatItem[], TKey, number>({
  queryKey: ...,
  queryFn: ...,
  getNextPageParam: ...,
  // structural sharing により同一データなら同一参照が返り、Component 再レンダ時の
  // 再計算を抑制（useMemo より効率的）
  select: (data) => data.pages.flatMap((p) => p.items),
});

const items = query.data ?? [];
```

**理由**: `select` は TanStack Query の structural sharing を利用するため、同じ query 結果なら同じ参照を返す。`useMemo` は dependency 比較のみで参照同一性は保証しない。

## 5. `placeholderData: keepPreviousData` の使い所

検索・フィルタ変更時に「画面が一瞬空になる」UX 悪化を防ぐ。新 queryKey 取得中も旧 page を表示し続ける。

```ts
import { keepPreviousData } from "@tanstack/react-query";

useInfiniteQuery({
  queryKey: socialSearchQueryKey(userId, debouncedInput),
  ...,
  placeholderData: keepPreviousData,
});
```

`isFetching && !isLoading` で「バックグラウンド更新中」のサブインジケータを出すと、ユーザーが新結果を待っていることを示せる。

## 6. localStorage 永続化と除外条件

`PersistQueryClientProvider` (`QueryProvider.tsx`) で全 query を localStorage に persist しているが、容量上限（5MB 前後）を圧迫しないため以下を除外：

```ts
shouldDehydrateQuery: (query) =>
  query.state.status === "success" &&
  Boolean(query.state.data) &&
  query.queryKey[0] !== "social-search",
```

**除外候補の判断**:
- 検索結果のように page が無限に積み重なるもの → 除外
- 認証セッションに紐付くが揮発しても問題ないもの → 除外
- 高頻度更新で persist するメリットが薄いもの → 除外

## 7. グローバル fetch インジケータ

`GlobalFetchIndicator` (`components/shared/GlobalFetchIndicator/`) が `useIsFetching()` で全クエリの fetch 数を監視し、上端に薄い 2px プログレスバーを表示する。

個別画面で大きな Loader を出さなくても、ユーザーは「何か取得中」と認識できる。バックグラウンド refetch も対象。

## 8. DevTools

開発時のみ `@tanstack/react-query-devtools` のフローティングボタンが画面右下に表示される（`QueryProvider.tsx` 内で `process.env.NODE_ENV !== "production"` 条件で `next/dynamic` 経由 lazy import）。

**localStorage persistor との注意点**: Devtools の "Remove from cache" は localStorage を直接書き換えない。整合を取りたい場合は手動で `localStorage.clear()` または該当キー削除。

## 9. 既存実装の参照ポイント

| 実装パターン | ファイル |
|---|---|
| `useInfiniteQuery` 基本形 | `frontend/src/lib/hooks/useSocialFeed.ts` |
| `useInfiniteQuery` + 検索 + `keepPreviousData` | `frontend/src/lib/hooks/useSocialSearch.ts` |
| `useMutation` + 楽観的削除 + ロールバック | `frontend/src/lib/hooks/useTrainingPagesData.ts` |
| cross-cache 更新 (`updatePost`) | `frontend/src/lib/hooks/useSocialFeed.ts` の `updatePost` / `useRemoveFromSocialFeedCache` |
| polling | `frontend/src/lib/hooks/useUnreadNotificationCount.ts` |
| IntersectionObserver sentinel | `frontend/src/app/[locale]/(authenticated)/(tabbed)/social/posts/SocialPostsFeed.tsx` |
| `useOptimistic` + `useTransition` | `frontend/src/app/[locale]/(public)/social/posts/[post_id]/SocialPostDetail.tsx` の `handleReplyEdit` |
| prefetchInfiniteQuery (タブ先読み) | `frontend/src/lib/hooks/useSocialFeed.ts` の `useEffect` 内 |
