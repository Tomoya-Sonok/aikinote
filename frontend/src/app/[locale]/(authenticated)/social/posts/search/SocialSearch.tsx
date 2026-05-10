"use client";

import {
  CaretDownIcon,
  CaretUpIcon,
  CheckFatIcon,
  FunnelIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import {
  type ChangeEvent,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/shared/Button/Button";
import {
  DojoStyleAutocomplete,
  type DojoStyleOption,
} from "@/components/shared/DojoStyleAutocomplete/DojoStyleAutocomplete";
import {
  SocialHeader,
  SocialLayout,
} from "@/components/shared/layouts/SocialLayout";
import { PremiumUpgradeModal } from "@/components/shared/PremiumUpgradeModal/PremiumUpgradeModal";
import { SearchInput } from "@/components/shared/SearchInput/SearchInput";
import { SelectInput } from "@/components/shared/SelectInput/SelectInput";
import { AIKIDO_RANK_OPTIONS } from "@/lib/constants/aikidoRank";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";
import { useRouter } from "@/lib/i18n/routing";
import styles from "./SocialSearch.module.css";
import {
  type SearchResultsHandle,
  SocialSearchResults,
} from "./SocialSearchResults";

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

    const handleSubmit = useCallback(
      (value: string) => {
        onSubmit(value);
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
        onSubmit={handleSubmit}
        onClear={handleClear}
        placeholder={placeholder}
      />
    );
  }),
);

export function SocialSearch() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations("socialPosts");
  const searchBarRef = useRef<SearchBarHandle>(null);
  const [isQueryActive, setIsQueryActive] = useState(false);
  const [dojoName, setDojoName] = useState("");
  const [dojoStyleId, setDojoStyleId] = useState<string | null>(null);
  const [rank, setRank] = useState("");
  const [postTypes, setPostTypes] = useState<Set<"post" | "training_record">>(
    new Set<"post" | "training_record">(["post", "training_record"]),
  );
  const [showFilters, setShowFilters] = useState(true);
  const isInitializedRef = useRef(false);
  const resultsRef = useRef<SearchResultsHandle>(null);
  const { isPremium, loading: subLoading } = useSubscription();
  const isFreeUser = !subLoading && !isPremium;
  const { track } = useUmamiTrack();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // URLパラメータから検索条件を読み取り・復元（ブラウザバック/ハッシュタグリンク対応）
  // biome-ignore lint/correctness/useExhaustiveDependencies: 初回マウント + user.id 確定時のみ実行
  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) return;
    const params = new URLSearchParams(window.location.search);
    const hashtagParam = params.get("hashtag");
    const qParam = params.get("q");
    const dojoParam = params.get("dojo");
    const rankParam = params.get("rank");
    const typeParam = params.get("type");
    const validType =
      typeParam === "post" || typeParam === "training_record"
        ? typeParam
        : undefined;

    if (dojoParam) setDojoName(dojoParam);
    if (rankParam) setRank(rankParam);
    if (validType)
      setPostTypes(new Set<"post" | "training_record">([validType]));
    if (dojoParam || rankParam || validType) setShowFilters(true);

    // Free ユーザーはURL復元時に検索を実行しない（表示のみ）
    if (hashtagParam) {
      const searchQuery = `#${hashtagParam}`;
      searchBarRef.current?.setQuery(searchQuery);
      if (!isFreeUser) {
        resultsRef.current?.search(
          searchQuery,
          dojoParam || undefined,
          rankParam || undefined,
          hashtagParam,
          validType,
        );
        resultsRef.current?.addToHistory(searchQuery);
      }
    } else if (qParam) {
      searchBarRef.current?.setQuery(qParam);
      if (!isFreeUser) {
        resultsRef.current?.search(
          qParam,
          dojoParam || undefined,
          rankParam || undefined,
          undefined,
          validType,
        );
      }
    } else if ((dojoParam || rankParam || validType) && !isFreeUser) {
      resultsRef.current?.search(
        "",
        dojoParam || undefined,
        rankParam || undefined,
        undefined,
        validType,
      );
    }

    isInitializedRef.current = true;
  }, [user?.id]);

  const getPostTypeParam = useCallback(
    (types: Set<"post" | "training_record">) => {
      if (types.size === 2) return undefined;
      return types.values().next().value as "post" | "training_record";
    },
    [],
  );

  const syncUrlParams = useCallback(
    (params: {
      q?: string;
      hashtag?: string;
      dojo?: string;
      rank?: string;
      type?: string;
    }) => {
      if (!isInitializedRef.current) return;
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      url.searchParams.delete("hashtag");
      url.searchParams.delete("dojo");
      url.searchParams.delete("rank");
      url.searchParams.delete("type");
      for (const [key, value] of Object.entries(params)) {
        if (value) {
          url.searchParams.set(key, value);
        }
      }
      // Next.js 16 は window.history.replaceState をパッチして ACTION_RESTORE を
      // ディスパッチし、ルーターレベルの再レンダリングを引き起こす。
      // プロトタイプの元メソッドを直接呼ぶことでパッチをバイパスする。
      History.prototype.replaceState.call(history, null, "", url.toString());
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
      resultsRef.current?.search(
        q,
        d || undefined,
        r || undefined,
        undefined,
        pt,
      );
    },
    [postTypes, getPostTypeParam],
  );

  const handleSearchBarSearch = useCallback(
    (q: string) => {
      if (isFreeUser) {
        setShowUpgradeModal(true);
        return;
      }
      track("social_search_keyword");
      triggerSearch(q, dojoName, rank);
      syncUrlParams({
        q: q.trim() || undefined,
        dojo: dojoName || undefined,
        rank: rank || undefined,
        type: getPostTypeParam(postTypes),
      });
    },
    [
      isFreeUser,
      track,
      triggerSearch,
      dojoName,
      rank,
      syncUrlParams,
      getPostTypeParam,
      postTypes,
    ],
  );

  const handleSearchBarSubmit = useCallback(
    (q: string) => {
      if (isFreeUser) {
        setShowUpgradeModal(true);
        return;
      }
      if (q.trim()) {
        resultsRef.current?.addToHistory(q.trim());
      }
    },
    [isFreeUser],
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
      track("social_search_filter_dojo");
      setDojoName(dojoStyle.dojo_name);
      setDojoStyleId(dojoStyle.id);
      const q = searchBarRef.current?.getQuery() ?? "";
      triggerSearch(q, dojoStyle.dojo_name, rank);
      syncUrlParams({
        q: q.trim() || undefined,
        dojo: dojoStyle.dojo_name || undefined,
        rank: rank || undefined,
        type: getPostTypeParam(postTypes),
      });
    },
    [track, triggerSearch, rank, syncUrlParams, getPostTypeParam, postTypes],
  );

  const handleDojoStyleClear = useCallback(() => {
    setDojoName("");
    setDojoStyleId(null);
    const q = searchBarRef.current?.getQuery() ?? "";
    triggerSearch(q, "", rank);
    syncUrlParams({
      q: q.trim() || undefined,
      rank: rank || undefined,
      type: getPostTypeParam(postTypes),
    });
  }, [triggerSearch, rank, syncUrlParams, getPostTypeParam, postTypes]);

  const handlePostTypeToggle = useCallback(
    (type: "post" | "training_record") => {
      track("social_search_filter_post_type");
      const next = new Set(postTypes);
      if (next.has(type) && next.size > 1) {
        next.delete(type);
      } else {
        next.add(type);
      }
      setPostTypes(next);
      const q = searchBarRef.current?.getQuery() ?? "";
      triggerSearch(q, dojoName, rank, next);
      syncUrlParams({
        q: q.trim() || undefined,
        dojo: dojoName || undefined,
        rank: rank || undefined,
        type: getPostTypeParam(next),
      });
    },
    [
      track,
      postTypes,
      triggerSearch,
      dojoName,
      rank,
      syncUrlParams,
      getPostTypeParam,
    ],
  );

  const handleRankChange = useCallback(
    (value: string) => {
      track("social_search_filter_rank");
      setRank(value);
      const q = searchBarRef.current?.getQuery() ?? "";
      triggerSearch(q, dojoName, value);
      syncUrlParams({
        q: q.trim() || undefined,
        dojo: dojoName || undefined,
        rank: value || undefined,
        type: getPostTypeParam(postTypes),
      });
    },
    [
      track,
      triggerSearch,
      dojoName,
      syncUrlParams,
      getPostTypeParam,
      postTypes,
    ],
  );

  const handleBack = useCallback(() => {
    router.replace("/social/posts");
  }, [router]);

  const handleHistoryClick = useCallback(
    (historyQuery: string) => {
      track("social_search_use_history", { keyword: historyQuery });
      searchBarRef.current?.setQuery(historyQuery);
      triggerSearch(historyQuery, dojoName, rank);
      resultsRef.current?.addToHistory(historyQuery);
      syncUrlParams({
        q: historyQuery.trim() || undefined,
        dojo: dojoName || undefined,
        rank: rank || undefined,
        type: getPostTypeParam(postTypes),
      });
    },
    [
      track,
      triggerSearch,
      dojoName,
      rank,
      syncUrlParams,
      getPostTypeParam,
      postTypes,
    ],
  );

  const handleTrendingClick = useCallback(
    (hashtagName: string) => {
      track("social_search_use_trending");
      const searchQuery = `#${hashtagName}`;
      searchBarRef.current?.setQuery(searchQuery);
      resultsRef.current?.search(
        searchQuery,
        dojoName || undefined,
        rank || undefined,
        hashtagName,
      );
      resultsRef.current?.addToHistory(searchQuery);
      syncUrlParams({
        hashtag: hashtagName,
        dojo: dojoName || undefined,
        rank: rank || undefined,
        type: getPostTypeParam(postTypes),
      });
    },
    [track, dojoName, rank, syncUrlParams, getPostTypeParam, postTypes],
  );

  const handleFilterToggle = useCallback(() => {
    track("social_search_filter_section_toggle");
    if (showFilters && !isFreeUser) {
      setDojoName("");
      setDojoStyleId(null);
      setRank("");
      setPostTypes(
        new Set<"post" | "training_record">(["post", "training_record"]),
      );
      const q = searchBarRef.current?.getQuery() ?? "";
      triggerSearch(
        q,
        "",
        "",
        new Set<"post" | "training_record">(["post", "training_record"]),
      );
      syncUrlParams({
        q: q.trim() || undefined,
      });
    }
    setShowFilters((prev) => !prev);
  }, [track, isFreeUser, showFilters, triggerSearch, syncUrlParams]);

  const hasActiveFilters =
    dojoName.trim() !== "" || rank !== "" || postTypes.size < 2;
  const isSearchActive = isQueryActive || hasActiveFilters;

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
        {isFreeUser && (
          <button
            type="button"
            className={styles.searchOverlay}
            onClick={() => setShowUpgradeModal(true)}
            aria-label={t("searchPlaceholder")}
          />
        )}
      </div>
    ),
    [
      isFreeUser,
      handleSearchBarSearch,
      handleSearchBarSubmit,
      handleQueryActiveChange,
      t,
    ],
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
          {showFilters ? t("filterClose") : t("filterToggle")}
        </span>
      </Button>
    ),
    [handleFilterToggle, hasActiveFilters, showFilters, t],
  );

  return (
    <SocialLayout showTabNavigation={false}>
      <div className={styles.stickyTop}>
        <SocialHeader
          onBack={handleBack}
          backLabel={t("back")}
          center={centerElement}
          right={rightElement}
        />

        {showFilters && (
          <div className={styles.filterSection}>
            {isFreeUser && (
              <button
                type="button"
                className={styles.filterSectionOverlay}
                onClick={() => setShowUpgradeModal(true)}
                aria-label="Premium"
              />
            )}
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>{t("postTypeFilter")}</span>
              <fieldset className={styles.postTypeSelector}>
                <button
                  type="button"
                  className={`${styles.postTypeButton} ${postTypes.has("post") ? styles.postTypeActive : ""}`}
                  aria-pressed={postTypes.has("post")}
                  onClick={() => handlePostTypeToggle("post")}
                >
                  {postTypes.has("post") && <CheckFatIcon size={14} />}
                  {t("createTypePost")}
                </button>
                <button
                  type="button"
                  className={`${styles.postTypeButton} ${postTypes.has("training_record") ? styles.postTypeActive : ""}`}
                  aria-pressed={postTypes.has("training_record")}
                  onClick={() => handlePostTypeToggle("training_record")}
                >
                  {postTypes.has("training_record") && (
                    <CheckFatIcon size={14} />
                  )}
                  {t("createTypeTraining")}
                </button>
              </fieldset>
            </div>
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>{t("dojoFilter")}</span>
              <div className={styles.filterFieldWrapper}>
                <DojoStyleAutocomplete
                  value={dojoName}
                  onChange={handleDojoNameChange}
                  onSelect={handleDojoStyleSelect}
                  placeholder={t("dojoFilterPlaceholder")}
                  selectedId={dojoStyleId}
                  onClear={handleDojoStyleClear}
                />
              </div>
            </div>
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>{t("rankFilter")}</span>
              <SelectInput
                className={styles.filterSelectWrapper}
                value={rank}
                onChange={(e) => handleRankChange(e.target.value)}
                aria-label={t("rankFilter")}
              >
                <option value="">ー</option>
                {AIKIDO_RANK_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </SelectInput>
            </div>
          </div>
        )}

        <div className={styles.filterToggleTabWrapper}>
          <button
            type="button"
            className={styles.filterToggleTab}
            onClick={handleFilterToggle}
            aria-label={showFilters ? t("filterClose") : t("filterToggle")}
          >
            {showFilters ? (
              <CaretUpIcon size={14} />
            ) : (
              <CaretDownIcon size={14} />
            )}
          </button>
        </div>
      </div>

      <SocialSearchResults
        ref={resultsRef}
        userId={user?.id}
        isFreeUser={isFreeUser}
        isSearchActive={isSearchActive}
        onHistoryClick={handleHistoryClick}
        onTrendingClick={handleTrendingClick}
        onPremiumAction={() => setShowUpgradeModal(true)}
      />
      <PremiumUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        translationKey="premiumModalSearch"
      />
    </SocialLayout>
  );
}
