import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { deletePage, getPages } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatToLocalDateString } from "@/lib/utils/dateUtils";
import type { TrainingPageData } from "@/types/training";

const TRAINING_PAGES_FETCH_LIMIT = 25;

export interface FetchOptions {
  query?: string;
  tags?: string[];
  startDate?: string | null;
  endDate?: string | null;
  sortOrder?: "newest" | "oldest";
}

interface NormalizedOptions {
  query: string;
  tags: string[];
  startDate: string | null;
  endDate: string | null;
  sortOrder: "newest" | "oldest";
}

interface TrainingPagesPage {
  training_pages: TrainingPageData[];
  total_count: number;
  next_offset: number | null;
}

export const trainingPagesQueryKey = (
  userId: string | undefined,
  options: NormalizedOptions,
) => ["training-pages", userId, options] as const;

export const trainingPagesUnfilteredCountQueryKey = (
  userId: string | undefined,
) => ["training-pages-unfiltered-count", userId] as const;

function normalizeOptions(options: FetchOptions): NormalizedOptions {
  return {
    query: options.query ?? "",
    tags: options.tags ?? [],
    startDate: options.startDate ?? null,
    endDate: options.endDate ?? null,
    sortOrder: options.sortOrder ?? "newest",
  };
}

function hasAnyFilters(options: NormalizedOptions): boolean {
  return (
    !!options.query ||
    options.tags.length > 0 ||
    !!options.startDate ||
    !!options.endDate
  );
}

export function useTrainingPagesData(options: FetchOptions = {}) {
  const t = useTranslations();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const filtersApplied = hasAnyFilters(normalizedOptions);

  const pagesQuery = useInfiniteQuery<
    TrainingPagesPage,
    Error,
    InfiniteData<TrainingPagesPage>,
    ReturnType<typeof trainingPagesQueryKey>,
    number
  >({
    queryKey: trainingPagesQueryKey(user?.id, normalizedOptions),
    enabled: !authLoading && !!user?.id,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!user?.id) {
        return { training_pages: [], total_count: 0, next_offset: null };
      }
      const response = await getPages({
        userId: user.id,
        limit: TRAINING_PAGES_FETCH_LIMIT,
        offset: pageParam,
        query: normalizedOptions.query,
        tags: normalizedOptions.tags,
        startDate: normalizedOptions.startDate ?? undefined,
        endDate: normalizedOptions.endDate ?? undefined,
        sortOrder: normalizedOptions.sortOrder,
      });

      if (!response.success || !response.data) {
        throw new Error(
          (response && "error" in response && response.error) ||
            t("personalPages.dataFetchFailed"),
        );
      }

      const trainingPages: TrainingPageData[] =
        response.data.training_pages.map((item) => ({
          id: item.page.id,
          title: item.page.title,
          content: item.page.content,
          is_public: item.page.is_public ?? false,
          date: formatToLocalDateString(item.page.created_at),
          tags: item.tags.map((tag) => tag.name),
          attachments: item.attachments ?? [],
        }));

      const loadedSoFar = pageParam + trainingPages.length;
      const nextOffset =
        loadedSoFar < response.data.total_count ? loadedSoFar : null;

      return {
        training_pages: trainingPages,
        total_count: response.data.total_count,
        next_offset: nextOffset,
      };
    },
    getNextPageParam: (lastPage) => lastPage.next_offset ?? undefined,
  });

  const allTrainingPageData = useMemo(
    () => pagesQuery.data?.pages.flatMap((p) => p.training_pages) ?? [],
    [pagesQuery.data],
  );

  const totalCount = pagesQuery.data?.pages[0]?.total_count ?? 0;

  // unfilteredTotalCount: フィルタ未適用時の最新 total_count を反映
  // フィルタ適用中でも「何も登録が無いのか / フィルタで 0 件なのか」を判別する用途
  const unfilteredTotalCount = useMemo<number | null>(() => {
    if (!filtersApplied) {
      return totalCount > 0 || pagesQuery.isSuccess ? totalCount : null;
    }
    // フィルタ適用中は未フィルタのキャッシュから読み取る
    const unfilteredCached = queryClient.getQueryData<
      InfiniteData<TrainingPagesPage>
    >(
      trainingPagesQueryKey(user?.id, {
        query: "",
        tags: [],
        startDate: null,
        endDate: null,
        sortOrder: normalizedOptions.sortOrder,
      }),
    );
    return unfilteredCached?.pages[0]?.total_count ?? null;
  }, [
    filtersApplied,
    totalCount,
    pagesQuery.isSuccess,
    queryClient,
    user?.id,
    normalizedOptions.sortOrder,
  ]);

  const hasMore = !!pagesQuery.hasNextPage;

  const loadMore = useCallback(() => {
    if (!pagesQuery.hasNextPage || pagesQuery.isFetchingNextPage) return;
    void pagesQuery.fetchNextPage();
  }, [pagesQuery]);

  // removePage: 楽観的削除 → 失敗時ロールバック
  const removeMutation = useMutation({
    mutationFn: async (pageId: string) => {
      if (!user?.id) {
        throw new Error(t("personalPages.loginRequired"));
      }
      const response = await deletePage(pageId, user.id);
      if (!response.success) {
        throw new Error(response.error || t("personalPages.pageDeleteFailed"));
      }
      return pageId;
    },
    onMutate: async (pageId) => {
      const currentKey = trainingPagesQueryKey(user?.id, normalizedOptions);
      await queryClient.cancelQueries({ queryKey: currentKey });
      const previous =
        queryClient.getQueryData<InfiniteData<TrainingPagesPage>>(currentKey);

      // 全ページから該当 pageId を除去
      queryClient.setQueryData<InfiniteData<TrainingPagesPage>>(
        currentKey,
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  training_pages: page.training_pages.filter(
                    (p) => p.id !== pageId,
                  ),
                  total_count: Math.max(0, page.total_count - 1),
                })),
              }
            : old,
      );

      return { previous };
    },
    onError: (error, _pageId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          trainingPagesQueryKey(user?.id, normalizedOptions),
          context.previous,
        );
      }
      console.error("Failed to delete page:", error);
      alert(
        error instanceof Error
          ? error.message
          : t("personalPages.pageDeleteFailed"),
      );
    },
    onSettled: () => {
      // 全ての training-pages キャッシュを無効化（フィルタ違いも含めて次回参照時に最新化）
      queryClient.invalidateQueries({ queryKey: ["training-pages"] });
    },
  });

  const removePage = useCallback(
    async (pageId: string) => {
      try {
        await removeMutation.mutateAsync(pageId);
        return true;
      } catch {
        return false;
      }
    },
    [removeMutation],
  );

  return {
    loading: authLoading || pagesQuery.isLoading,
    allTrainingPageData,
    totalCount,
    unfilteredTotalCount,
    hasMore,
    loadMore,
    removePage,
  };
}
