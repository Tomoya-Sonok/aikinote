"use client";

import { FunnelIcon } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { type ChangeEvent, useCallback, useId, useState } from "react";
import { SocialPostCard } from "@/components/features/social/SocialPostCard/SocialPostCard";
import { Button } from "@/components/shared/Button/Button";
import { Loader } from "@/components/shared/Loader/Loader";
import {
  SocialHeader,
  SocialLayout,
} from "@/components/shared/layouts/SocialLayout";
import { SearchInput } from "@/components/shared/SearchInput/SearchInput";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSocialFavorite } from "@/lib/hooks/useSocialFavorite";
import { useSocialSearch } from "@/lib/hooks/useSocialSearch";
import styles from "./SocialSearch.module.css";

// TODO: 技名、カテゴリなど追加フィルター
const RANK_OPTIONS = [
  "",
  "十段",
  "九段",
  "八段",
  "七段",
  "六段",
  "五段",
  "四段",
  "三段",
  "二段",
  "初段",
  "一級",
  "二級",
  "三級",
  "四級",
  "五級",
];

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

  const hasActiveFilters = dojoName.trim() !== "" || rank !== "";

  return (
    <SocialLayout>
      <SocialHeader
        onBack={handleBack}
        backLabel={t("back")}
        center={
          <div className={styles.searchWrapper}>
            <SearchInput
              value={query}
              onChange={handleQueryChange}
              placeholder={t("searchPlaceholder")}
            />
          </div>
        }
        right={
          <Button
            className={`${styles.filterButton} ${hasActiveFilters ? styles.filterActive : ""}`}
            onClick={() => setShowFilters((prev) => !prev)}
            aria-label={t("filterToggle")}
          >
            <FunnelIcon
              size={20}
              weight={hasActiveFilters ? "fill" : "regular"}
            />
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
              {RANK_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r || "-"}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className={styles.results}>
        {isLoading ? (
          <Loader centered size="small" />
        ) : (query.trim() || hasActiveFilters) && results.length === 0 ? (
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
