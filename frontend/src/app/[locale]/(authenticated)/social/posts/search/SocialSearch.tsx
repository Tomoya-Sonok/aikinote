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
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { SocialPostCard } from "@/components/features/social/SocialPostCard/SocialPostCard";
import { Button } from "@/components/shared/Button/Button";
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

export function SocialSearch() {
  const { user } = useAuth();
  const locale = useLocale();
  const t = useTranslations("socialPosts");
  const [query, setQuery] = useState("");
  const [dojoName, setDojoName] = useState("");
  const [rank, setRank] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const dojoFilterId = useId();
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
      setQuery(searchQuery);
      search(searchQuery, undefined, undefined, hashtagParam);
      addToHistory(searchQuery);
    }
  }, [user?.id]);

  const triggerSearch = useCallback(
    (q: string, d: string, r: string) => {
      search(q, d || undefined, r || undefined);
    },
    [search],
  );

  const handleQueryChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      triggerSearch(value, dojoName, rank);
    },
    [triggerSearch, dojoName, rank],
  );

  const handleDojoNameChange = useCallback(
    (value: string) => {
      setDojoName(value);
      triggerSearch(query, value, rank);
    },
    [triggerSearch, query, rank],
  );

  const handleRankChange = useCallback(
    (value: string) => {
      setRank(value);
      triggerSearch(query, dojoName, value);
    },
    [triggerSearch, query, dojoName],
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
      setQuery(historyQuery);
      triggerSearch(historyQuery, dojoName, rank);
      addToHistory(historyQuery);
    },
    [triggerSearch, dojoName, rank, addToHistory],
  );

  const handleTrendingClick = useCallback(
    (hashtagName: string) => {
      const searchQuery = `#${hashtagName}`;
      setQuery(searchQuery);
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

  const handleSearchSubmit = useCallback(() => {
    if (query.trim()) {
      addToHistory(query.trim());
    }
  }, [query, addToHistory]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSearchSubmit();
      }
    },
    [handleSearchSubmit],
  );

  const hasActiveFilters = dojoName.trim() !== "" || rank !== "";
  const isSearchActive = query.trim() !== "" || hasActiveFilters;
  const showEmptyState = !isSearchActive && results.length === 0 && !isLoading;

  return (
    <SocialLayout>
      <div className={styles.stickyTop}>
        <SocialHeader
          onBack={handleBack}
          backLabel={t("back")}
          center={
            <div className={styles.searchWrapper}>
              <SearchInput
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleKeyDown}
                placeholder={t("searchPlaceholder")}
              />
            </div>
          }
          right={
            <Button
              className={`${styles.filterButton} ${hasActiveFilters ? styles.filterActive : ""}`}
              onClick={() => {
                setShowFilters((prev) => {
                  const willHide = prev;
                  // フィルター非表示時に条件をクリア
                  if (willHide) {
                    setDojoName("");
                    setRank("");
                    triggerSearch(query, "", "");
                  }
                  return !prev;
                });
              }}
              aria-label={t("filterToggle")}
            >
              <FunnelIcon
                size={20}
                weight={hasActiveFilters ? "fill" : "regular"}
              />
              <span className={styles.filterButtonLabel}>
                {hasActiveFilters ? t("filterClear") : t("filterToggle")}
              </span>
            </Button>
          }
        />

        {showFilters && (
          <div className={styles.filterSection}>
            <div className={styles.filterRow}>
              <label className={styles.filterLabel} htmlFor={dojoFilterId}>
                {t("dojoFilter")}
              </label>
              <input
                id={dojoFilterId}
                type="text"
                className={styles.filterInput}
                value={dojoName}
                onChange={(e) => handleDojoNameChange(e.target.value)}
                placeholder={t("dojoFilter")}
              />
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
        {isLoading ? (
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
