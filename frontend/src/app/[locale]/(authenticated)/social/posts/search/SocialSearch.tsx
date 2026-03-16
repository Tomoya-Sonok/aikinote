"use client";

import {
  ClockCounterClockwiseIcon,
  FunnelIcon,
  TrendUpIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import {
  type ChangeEvent,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { SocialPostCard } from "@/components/features/social/SocialPostCard/SocialPostCard";
import { Button } from "@/components/shared/Button/Button";
import {
  DojoStyleAutocomplete,
  type DojoStyleOption,
} from "@/components/shared/DojoStyleAutocomplete/DojoStyleAutocomplete";
import { Loader } from "@/components/shared/Loader/Loader";
import {
  SocialHeader,
  SocialLayout,
} from "@/components/shared/layouts/SocialLayout";
import { SearchInput } from "@/components/shared/SearchInput/SearchInput";
import { AIKIDO_RANK_OPTIONS } from "@/lib/constants/aikidoRank";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSearchHistory } from "@/lib/hooks/useSearchHistory";
import { useSocialFavorite } from "@/lib/hooks/useSocialFavorite";
import { useSocialSearch } from "@/lib/hooks/useSocialSearch";
import { useTrendingHashtags } from "@/lib/hooks/useTrendingHashtags";
import styles from "./SocialSearch.module.css";

interface SearchBarHandle {
  setQuery: (value: string) => void;
  getQuery: () => string;
}

/**
 * 検索バー子コンポーネント — query ステートをローカル管理し、
 * 親の再レンダリングを防止する。
 */
const SocialSearchBar = memo(
  forwardRef<
    SearchBarHandle,
    {
      onSearch: (query: string) => void;
      onSubmit: (query: string) => void;
      onQueryActiveChange: (active: boolean) => void;
      placeholder: string;
    }
  >(function SocialSearchBar(
    { onSearch, onSubmit, onQueryActiveChange, placeholder },
    ref,
  ) {
    const [query, setQuery] = useState("");
    const queryRef = useRef(query);

    useImperativeHandle(
      ref,
      () => ({
        setQuery: (value: string) => {
          setQuery(value);
          queryRef.current = value;
          onQueryActiveChange(value.trim() !== "");
        },
        getQuery: () => queryRef.current,
      }),
      [onQueryActiveChange],
    );

    const handleChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        queryRef.current = value;
        onSearch(value);
        onQueryActiveChange(value.trim() !== "");
      },
      [onSearch, onQueryActiveChange],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          onSubmit(queryRef.current);
        }
      },
      [onSubmit],
    );

    const handleClear = useCallback(() => {
      setQuery("");
      queryRef.current = "";
      onSearch("");
      onQueryActiveChange(false);
    }, [onSearch, onQueryActiveChange]);

    return (
      <SearchInput
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClear={handleClear}
        placeholder={placeholder}
      />
    );
  }),
);

export function SocialSearch() {
  const { user } = useAuth();
  const locale = useLocale();
  const t = useTranslations("socialPosts");
  const searchBarRef = useRef<SearchBarHandle>(null);
  const [isQueryActive, setIsQueryActive] = useState(false);
  const [dojoName, setDojoName] = useState("");
  const [dojoStyleId, setDojoStyleId] = useState<string | null>(null);
  const [rank, setRank] = useState("");
  const [postTypes, setPostTypes] = useState<Set<"post" | "training_record">>(
    new Set<"post" | "training_record">(["post", "training_record"]),
  );
  const [showFilters, setShowFilters] = useState(false);
  const rankFilterId = useId();
  const { results, isLoading, search, updateResult } = useSocialSearch(
    user?.id,
  );
  const { handleToggleFavorite } = useSocialFavorite();
  const { history, addToHistory, removeFromHistory, clearHistory } =
    useSearchHistory();
  const { trending, isLoading: trendingLoading } = useTrendingHashtags();

  // URLパラメータからハッシュタグを読み取り（HashtagTextリンクからの遷移対応）
  // biome-ignore lint/correctness/useExhaustiveDependencies: 初回マウント + user.id 確定時のみ実行
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const hashtagParam = params.get("hashtag");
    if (hashtagParam && user?.id) {
      const searchQuery = `#${hashtagParam}`;
      searchBarRef.current?.setQuery(searchQuery);
      search(searchQuery, undefined, undefined, hashtagParam);
      addToHistory(searchQuery);
    }
  }, [user?.id]);

  const getPostTypeParam = useCallback(
    (types: Set<"post" | "training_record">) => {
      if (types.size === 2) return undefined;
      return types.values().next().value as "post" | "training_record";
    },
    [],
  );

  const triggerSearch = useCallback(
    (
      q: string,
      d: string,
      r: string,
      types?: Set<"post" | "training_record">,
    ) => {
      const pt = getPostTypeParam(types ?? postTypes);
      search(q, d || undefined, r || undefined, undefined, pt);
    },
    [search, postTypes, getPostTypeParam],
  );

  const handleSearchBarSearch = useCallback(
    (q: string) => {
      triggerSearch(q, dojoName, rank);
    },
    [triggerSearch, dojoName, rank],
  );

  const handleSearchBarSubmit = useCallback(
    (q: string) => {
      if (q.trim()) {
        addToHistory(q.trim());
      }
    },
    [addToHistory],
  );

  const handleQueryActiveChange = useCallback((active: boolean) => {
    setIsQueryActive(active);
  }, []);

  const handleDojoNameChange = useCallback((value: string) => {
    setDojoName(value);
    setDojoStyleId(null);
  }, []);

  const handleDojoStyleSelect = useCallback(
    (dojoStyle: DojoStyleOption) => {
      setDojoName(dojoStyle.dojo_name);
      setDojoStyleId(dojoStyle.id);
      triggerSearch(
        searchBarRef.current?.getQuery() ?? "",
        dojoStyle.dojo_name,
        rank,
      );
    },
    [triggerSearch, rank],
  );

  const handleDojoStyleClear = useCallback(() => {
    setDojoName("");
    setDojoStyleId(null);
    triggerSearch(searchBarRef.current?.getQuery() ?? "", "", rank);
  }, [triggerSearch, rank]);

  const handlePostTypeToggle = useCallback(
    (type: "post" | "training_record") => {
      setPostTypes((prev) => {
        const next = new Set(prev);
        if (next.has(type) && next.size > 1) {
          next.delete(type);
        } else {
          next.add(type);
        }
        triggerSearch(
          searchBarRef.current?.getQuery() ?? "",
          dojoName,
          rank,
          next,
        );
        return next;
      });
    },
    [triggerSearch, dojoName, rank],
  );

  const handleRankChange = useCallback(
    (value: string) => {
      setRank(value);
      triggerSearch(searchBarRef.current?.getQuery() ?? "", dojoName, value);
    },
    [triggerSearch, dojoName],
  );

  const handleFavoriteToggle = useCallback(
    (postId: string) => {
      handleToggleFavorite(postId, results, updateResult);
    },
    [handleToggleFavorite, results, updateResult],
  );

  const handlePostClick = useCallback(
    (postId: string) => {
      window.location.href = `/${locale}/social/posts/${postId}`;
    },
    [locale],
  );

  const handleBack = useCallback(() => {
    window.location.href = `/${locale}/social/posts`;
  }, [locale]);

  const handleHistoryClick = useCallback(
    (historyQuery: string) => {
      searchBarRef.current?.setQuery(historyQuery);
      triggerSearch(historyQuery, dojoName, rank);
      addToHistory(historyQuery);
    },
    [triggerSearch, dojoName, rank, addToHistory],
  );

  const handleTrendingClick = useCallback(
    (hashtagName: string) => {
      const searchQuery = `#${hashtagName}`;
      searchBarRef.current?.setQuery(searchQuery);
      search(
        searchQuery,
        dojoName || undefined,
        rank || undefined,
        hashtagName,
      );
      addToHistory(searchQuery);
    },
    [search, dojoName, rank, addToHistory],
  );

  const handleFilterToggle = useCallback(() => {
    setShowFilters((prev) => {
      const willHide = prev;
      if (willHide) {
        setDojoName("");
        setDojoStyleId(null);
        setRank("");
        setPostTypes(
          new Set<"post" | "training_record">(["post", "training_record"]),
        );
        triggerSearch(
          searchBarRef.current?.getQuery() ?? "",
          "",
          "",
          new Set<"post" | "training_record">(["post", "training_record"]),
        );
      }
      return !prev;
    });
  }, [triggerSearch]);

  const hasActiveFilters =
    dojoName.trim() !== "" || rank !== "" || postTypes.size < 2;
  const isSearchActive = isQueryActive || hasActiveFilters;
  const showEmptyState = !isSearchActive && results.length === 0 && !isLoading;

  // SocialHeader の center / right を useMemo で安定化
  // 結果到着時の親再レンダリングで SocialHeader（memo化済み）の再描画を防止
  const centerElement = useMemo(
    () => (
      <div className={styles.searchWrapper}>
        <SocialSearchBar
          ref={searchBarRef}
          onSearch={handleSearchBarSearch}
          onSubmit={handleSearchBarSubmit}
          onQueryActiveChange={handleQueryActiveChange}
          placeholder={t("searchPlaceholder")}
        />
      </div>
    ),
    [handleSearchBarSearch, handleSearchBarSubmit, handleQueryActiveChange, t],
  );

  const rightElement = useMemo(
    () => (
      <Button
        className={`${styles.filterButton} ${hasActiveFilters ? styles.filterActive : ""}`}
        onClick={handleFilterToggle}
        aria-label={t("filterToggle")}
      >
        <FunnelIcon size={20} weight={hasActiveFilters ? "fill" : "regular"} />
        <span className={styles.filterButtonLabel}>
          {hasActiveFilters ? t("filterClear") : t("filterToggle")}
        </span>
      </Button>
    ),
    [handleFilterToggle, hasActiveFilters, t],
  );

  return (
    <SocialLayout>
      <div className={styles.stickyTop}>
        <SocialHeader
          onBack={handleBack}
          backLabel={t("back")}
          center={centerElement}
          right={rightElement}
        />

        {showFilters && (
          <div className={styles.filterSection}>
            <fieldset className={styles.postTypeSelector}>
              <button
                type="button"
                className={`${styles.postTypeButton} ${postTypes.has("post") ? styles.postTypeActive : ""}`}
                aria-pressed={postTypes.has("post")}
                onClick={() => handlePostTypeToggle("post")}
              >
                {t("createTypePost")}
              </button>
              <button
                type="button"
                className={`${styles.postTypeButton} ${postTypes.has("training_record") ? styles.postTypeActive : ""}`}
                aria-pressed={postTypes.has("training_record")}
                onClick={() => handlePostTypeToggle("training_record")}
              >
                {t("createTypeTraining")}
              </button>
            </fieldset>
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>{t("dojoFilter")}</span>
              <div className={styles.filterFieldWrapper}>
                <DojoStyleAutocomplete
                  value={dojoName}
                  onChange={handleDojoNameChange}
                  onSelect={handleDojoStyleSelect}
                  placeholder={t("dojoFilter")}
                  selectedId={dojoStyleId}
                  onClear={handleDojoStyleClear}
                />
              </div>
            </div>
            <div className={styles.filterRow}>
              <label className={styles.filterLabel} htmlFor={rankFilterId}>
                {t("rankFilter")}
              </label>
              <select
                id={rankFilterId}
                className={styles.filterSelect}
                value={rank}
                onChange={(e) => handleRankChange(e.target.value)}
              >
                <option value="">-</option>
                {AIKIDO_RANK_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className={styles.results}>
        {results.length === 0 && isLoading ? (
          <Loader centered size="small" />
        ) : showEmptyState ? (
          <>
            {/* 検索履歴 */}
            {history.length > 0 && (
              <div className={styles.historySection}>
                <div className={styles.historyHeader}>
                  <span className={styles.sectionTitle}>
                    {t("recentSearches")}
                  </span>
                  <Button
                    className={styles.clearAllButton}
                    onClick={clearHistory}
                  >
                    {t("clearAll")}
                  </Button>
                </div>
                <div className={styles.historyList}>
                  {history.map((item) => (
                    // biome-ignore lint/a11y/useSemanticElements: Using div with role="button" because <button> causes hydration error with nested Button components
                    <div
                      key={item}
                      className={styles.historyItem}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleHistoryClick(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleHistoryClick(item);
                        }
                      }}
                    >
                      <ClockCounterClockwiseIcon
                        size={18}
                        className={styles.historyIcon}
                      />
                      <span className={styles.historyText}>{item}</span>
                      <Button
                        className={styles.historyDeleteButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromHistory(item);
                        }}
                        aria-label={t("deleteHistoryItem")}
                      >
                        <XIcon size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* トレンドハッシュタグ */}
            {!trendingLoading && trending.length > 0 && (
              <div
                className={
                  history.length > 0
                    ? styles.trendingSection
                    : styles.trendingSectionNoBorder
                }
              >
                <div className={styles.historyHeader}>
                  <span className={styles.sectionTitle}>
                    {t("trendingHashtags")}
                  </span>
                </div>
                <div className={styles.trendingList}>
                  {trending.map((tag) => (
                    // biome-ignore lint/a11y/useSemanticElements: Using div with role="button" for consistent styling with history items
                    <div
                      key={tag.name}
                      className={styles.trendingItem}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleTrendingClick(tag.name)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleTrendingClick(tag.name);
                        }
                      }}
                    >
                      <TrendUpIcon size={18} className={styles.trendingIcon} />
                      <span className={styles.trendingName}>#{tag.name}</span>
                      <span className={styles.trendingCount}>
                        {t("postsCount", { count: tag.count })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : isSearchActive && results.length === 0 ? (
          <p className={styles.empty}>{t("searchEmpty")}</p>
        ) : (
          results.map((post) => (
            <SocialPostCard
              key={post.id}
              post={post}
              currentUserId={user?.id ?? ""}
              onFavoriteToggle={handleFavoriteToggle}
              onClick={handlePostClick}
            />
          ))
        )}
      </div>
    </SocialLayout>
  );
}
