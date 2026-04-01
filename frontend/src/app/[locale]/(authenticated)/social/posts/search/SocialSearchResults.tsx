"use client";

import {
  ClockCounterClockwiseIcon,
  TrendUpIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { forwardRef, useCallback, useImperativeHandle } from "react";
import { SocialPostCard } from "@/components/features/social/SocialPostCard/SocialPostCard";
import { Button } from "@/components/shared/Button/Button";
import { Loader } from "@/components/shared/Loader/Loader";
import { useSearchHistory } from "@/lib/hooks/useSearchHistory";
import { useSocialFavorite } from "@/lib/hooks/useSocialFavorite";
import { useSocialSearch } from "@/lib/hooks/useSocialSearch";
import { useTrendingHashtags } from "@/lib/hooks/useTrendingHashtags";
import styles from "./SocialSearch.module.css";

export interface SearchResultsHandle {
  search: (
    query: string,
    dojoName?: string,
    rank?: string,
    hashtag?: string,
    postType?: "post" | "training_record",
  ) => void;
  addToHistory: (query: string) => void;
}

interface SocialSearchResultsProps {
  userId: string | undefined;
  isFreeUser: boolean;
  locale: string;
  isSearchActive: boolean;
  onHistoryClick: (query: string) => void;
  onTrendingClick: (hashtagName: string) => void;
  onPremiumAction: () => void;
}

export const SocialSearchResults = forwardRef<
  SearchResultsHandle,
  SocialSearchResultsProps
>(function SocialSearchResults(
  {
    userId,
    isFreeUser,
    locale,
    isSearchActive,
    onHistoryClick,
    onTrendingClick,
    onPremiumAction,
  },
  ref,
) {
  const t = useTranslations("socialPosts");
  const { results, isLoading, search, updateResult } = useSocialSearch(userId);
  const { handleToggleFavorite } = useSocialFavorite();
  const { history, addToHistory, removeFromHistory, clearHistory } =
    useSearchHistory();
  const { trending, isLoading: trendingLoading } = useTrendingHashtags();

  useImperativeHandle(
    ref,
    () => ({
      search,
      addToHistory,
    }),
    [search, addToHistory],
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

  const handleHistoryItemClick = useCallback(
    (query: string) => {
      if (isFreeUser) {
        onPremiumAction();
        return;
      }
      onHistoryClick(query);
    },
    [isFreeUser, onPremiumAction, onHistoryClick],
  );

  const handleTrendingItemClick = useCallback(
    (hashtagName: string) => {
      if (isFreeUser) {
        onPremiumAction();
        return;
      }
      onTrendingClick(hashtagName);
    },
    [isFreeUser, onPremiumAction, onTrendingClick],
  );

  const showEmptyState = !isSearchActive && results.length === 0 && !isLoading;

  return (
    <div className={styles.results}>
      {results.length === 0 && isLoading ? (
        <Loader centered size="large" />
      ) : showEmptyState ? (
        <>
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
                    onClick={() => handleHistoryItemClick(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleHistoryItemClick(item);
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
                    onClick={() => handleTrendingItemClick(tag.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleTrendingItemClick(tag.name);
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
            currentUserId={userId ?? ""}
            onFavoriteToggle={handleFavoriteToggle}
            onClick={handlePostClick}
          />
        ))
      )}
    </div>
  );
});
