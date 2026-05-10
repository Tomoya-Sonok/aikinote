"use client";

import {
  DotsThreeVerticalIcon,
  HeartIcon,
  ShareFatIcon,
} from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

const ReportModal = dynamic(
  () =>
    import("@/components/features/social/ReportModal/ReportModal").then(
      (m) => m.ReportModal,
    ),
  { ssr: false },
);

import { DeletedReplyItem } from "@/components/features/social/DeletedReplyItem/DeletedReplyItem";
import { SocialMediaGrid } from "@/components/features/social/SocialPostCard/SocialMediaGrid";
import { SocialReplyForm } from "@/components/features/social/SocialReplyForm/SocialReplyForm";
import { SocialReplyItem } from "@/components/features/social/SocialReplyItem/SocialReplyItem";
import { Button } from "@/components/shared/Button/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { HashtagText } from "@/components/shared/HashtagText/HashtagText";
import { Loader } from "@/components/shared/Loader/Loader";
import { ChatLayout } from "@/components/shared/layouts/ChatLayout";
import { SocialHeader } from "@/components/shared/layouts/SocialLayout";
import { PremiumUpgradeModal } from "@/components/shared/PremiumUpgradeModal/PremiumUpgradeModal";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import { SignupPromptModal } from "@/components/shared/SignupPromptModal/SignupPromptModal";
import { Tag } from "@/components/shared/Tag/Tag";
import { useToast } from "@/contexts/ToastContext";
import {
  blockUser,
  createSocialReply,
  deleteSocialPost,
  deleteSocialReply,
  getPublicSocialPost,
  getSocialPost,
  isDailyLimitError,
  isRateLimitError,
  markNotificationsRead,
  reportPost,
  reportReply,
  toggleFavorite,
  toggleReplyFavorite,
  updateSocialReply,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useDailyLimits } from "@/lib/hooks/useDailyLimits";
import { useRemoveFromSocialFeedCache } from "@/lib/hooks/useSocialFeed";
import { useRouter } from "@/lib/i18n/routing";
import { formatToRelativeTime } from "@/lib/utils/dateUtils";
import { linkifyText } from "@/lib/utils/linkifyText";
import { isWithinDeleteDisplayWindow } from "@/lib/utils/notificationUtils";
import { getNetworkAwareErrorMessage } from "@/lib/utils/offlineError";
import { buildShareUrl } from "@/lib/utils/share";
import styles from "./SocialPostDetail.module.css";

interface SocialReplyData {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_deleted: boolean;
  favorite_count: number;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    username: string;
    profile_image_url: string | null;
  };
  is_favorited: boolean;
}

interface SourcePageData {
  id: string;
  title: string;
  content: string;
  tags: { name: string; category: string }[];
}

interface PostDetailData {
  post: {
    id: string;
    user_id: string;
    content: string;
    post_type: string;
    author_dojo_name: string | null;
    favorite_count?: number;
    reply_count: number;
    created_at: string;
    updated_at: string;
    source_page_id?: string | null;
  };
  attachments: {
    id: string;
    type: string;
    url: string;
    thumbnail_url: string | null;
    original_filename: string | null;
  }[];
  tags: { id: string; name: string; category: string }[];
  author: {
    id: string;
    username: string;
    profile_image_url: string | null;
    aikido_rank: string | null;
  };
  replies: SocialReplyData[];
  is_favorited: boolean;
  source_page?: SourcePageData | null;
}

interface SocialPostDetailProps {
  postId: string;
}

export function SocialPostDetail({ postId }: SocialPostDetailProps) {
  const { user, isInitializing } = useAuth();
  const { canReply, incrementReplyCount } = useDailyLimits();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("socialPosts");

  const { showToast } = useToast();
  const [detail, setDetail] = useState<PostDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalKey, setUpgradeModalKey] =
    useState<string>("premiumModalBrowse");
  const menuRef = useRef<HTMLDivElement>(null);
  const removeFromFeedCache = useRemoveFromSocialFeedCache();

  const isAuthenticated = !!user;

  useEffect(() => {
    if (isInitializing) return;

    const fetchDetail = async () => {
      try {
        const result = user
          ? await getSocialPost(postId)
          : await getPublicSocialPost(postId);
        if (result.success && result.data) {
          setDetail(result.data as PostDetailData);
          if (user) {
            markNotificationsRead({ postId }).catch(() => {});
          }
        }
      } catch (error) {
        console.error("投稿詳細取得エラー:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [postId, user, isInitializing]);

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showMenu]);

  const handleBack = useCallback(() => {
    const referrer = document.referrer || "";
    const isInternalReferrer = referrer.startsWith(window.location.origin);
    const isFromSocialPage =
      referrer.includes("/social/posts") ||
      referrer.includes("/social/profile/");
    if (isInternalReferrer && isFromSocialPage && !referrer.includes("/edit")) {
      window.history.back();
    } else {
      router.replace("/social/posts");
    }
  }, [router]);

  const handleFavoriteToggle = useCallback(async () => {
    if (!isAuthenticated) {
      setShowSignupPrompt(true);
      return;
    }
    if (!detail) return;

    const wasFavorited = detail.is_favorited;
    const prevCount = detail.post.favorite_count ?? 0;

    setDetail((prev) =>
      prev
        ? {
            ...prev,
            is_favorited: !wasFavorited,
            post: {
              ...prev.post,
              favorite_count: wasFavorited
                ? Math.max(0, prevCount - 1)
                : prevCount + 1,
            },
          }
        : null,
    );

    try {
      await toggleFavorite(postId);
    } catch (error) {
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              is_favorited: wasFavorited,
              post: { ...prev.post, favorite_count: prevCount },
            }
          : null,
      );
      if (isDailyLimitError(error)) {
        showToast(t("favoriteDailyLimitReached"), "error");
      } else if (!navigator.onLine) {
        showToast(
          "オフラインです。ネットワークに接続してから再度お試しください。",
          "error",
        );
      }
    }
  }, [detail, postId, isAuthenticated, showToast, t]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteSocialPost(postId);
      // 楽観的 UI: フィードキャッシュから即時除去（戻り先で再フェッチを待たずに反映）
      removeFromFeedCache(postId);
      showToast(t("deleteSuccess"), "success");
      router.replace("/social/posts");
    } catch (error) {
      showToast(getNetworkAwareErrorMessage(error, t("deleteFailed")), "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [postId, router, showToast, t, removeFromFeedCache]);

  const handleReplySubmit = useCallback(
    async (content: string) => {
      if (!user?.id) return;
      try {
        const replyResult = await createSocialReply({
          postId,
          user_id: user.id,
          content,
        });
        if (replyResult.success && replyResult.warning) {
          showToast(replyResult.warning, "error");
        }
        incrementReplyCount();
        const result = await getSocialPost(postId);
        if (result.success && result.data) {
          setDetail(result.data as PostDetailData);
        }
      } catch (error) {
        const fallback = t(
          isRateLimitError(error) ? "replyRateLimited" : "replySendFailed",
        );
        showToast(getNetworkAwareErrorMessage(error, fallback), "error");
      }
    },
    [postId, user?.id, showToast, t, incrementReplyCount],
  );

  const handleReportSubmit = useCallback(
    async (
      reason:
        | "spam"
        | "harassment"
        | "inappropriate"
        | "impersonation"
        | "other",
      detailText?: string,
    ) => {
      if (!user?.id) return;
      try {
        await reportPost({
          postId,
          user_id: user.id,
          reason,
          detail: detailText,
        });
        showToast(t("reportSuccess"), "success");
        setShowReportModal(false);
      } catch {
        showToast(t("reportFailed"), "error");
      }
    },
    [postId, user?.id, showToast, t],
  );

  const handleReplyReport = useCallback(
    async (
      replyId: string,
      reason:
        | "spam"
        | "harassment"
        | "inappropriate"
        | "impersonation"
        | "other",
      detailText?: string,
    ) => {
      if (!user?.id) return;
      try {
        await reportReply({
          replyId,
          user_id: user.id,
          reason,
          detail: detailText,
        });
        showToast(t("reportSuccess"), "success");
      } catch {
        showToast(t("reportFailed"), "error");
      }
    },
    [user?.id, showToast, t],
  );

  const handleReplyBlock = useCallback(
    async (blockedUserId: string) => {
      if (!user?.id) return;
      // 詳細画面ではメニュー側で confirm を出さず即時実行（最小実装、Phase 3 の範囲）
      try {
        await blockUser(blockedUserId);
        showToast(t("blockSuccess"), "success");
        // 詳細画面のリロードはブラウザに任せ、楽観的更新は省略
      } catch {
        showToast(t("blockFailed"), "error");
      }
    },
    [user?.id, showToast, t],
  );

  const handleReplyEdit = useCallback(
    async (replyId: string, newContent: string) => {
      try {
        const editResult = await updateSocialReply({
          postId,
          replyId,
          content: newContent,
        });
        if (editResult.success && editResult.warning) {
          showToast(editResult.warning, "error");
        }
        const result = await getSocialPost(postId);
        if (result.success && result.data) {
          setDetail(result.data as PostDetailData);
        }
      } catch {
        showToast(t("replyEditFailed"), "error");
      }
    },
    [postId, showToast, t],
  );

  const handleReplyDelete = useCallback(
    async (replyId: string) => {
      try {
        await deleteSocialReply(postId, replyId);
        const result = await getSocialPost(postId);
        if (result.success && result.data) {
          setDetail(result.data as PostDetailData);
        }
      } catch {
        showToast(t("replyDeleteFailed"), "error");
      }
    },
    [postId, showToast, t],
  );

  const handleReplyFavoriteToggle = useCallback(
    (replyId: string) => {
      if (!detail) return;

      const targetReply = detail.replies.find((r) => r.id === replyId);
      if (!targetReply) return;

      const wasFavorited = targetReply.is_favorited;
      const prevCount = targetReply.favorite_count;

      // 楽観的更新
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              replies: prev.replies.map((r) =>
                r.id === replyId
                  ? {
                      ...r,
                      is_favorited: !wasFavorited,
                      favorite_count: wasFavorited
                        ? Math.max(0, prevCount - 1)
                        : prevCount + 1,
                    }
                  : r,
              ),
            }
          : null,
      );

      toggleReplyFavorite(replyId).catch((error) => {
        // エラー時ロールバック
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                replies: prev.replies.map((r) =>
                  r.id === replyId
                    ? {
                        ...r,
                        is_favorited: wasFavorited,
                        favorite_count: prevCount,
                      }
                    : r,
                ),
              }
            : null,
        );
        if (isDailyLimitError(error)) {
          showToast(t("favoriteDailyLimitReached"), "error");
        }
      });
    },
    [detail, showToast, t],
  );

  const handleStartEdit = useCallback(() => {
    setShowMenu(false);
    router.push(`/social/posts/${postId}/edit`);
  }, [router, postId]);

  const handleShare = useCallback(async () => {
    if (!detail) return;
    const url = buildShareUrl(`/${locale}/social/posts/${postId}`);
    const shareData = {
      title: "AikiNote",
      text: detail.post.content.slice(0, 100),
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        showToast(t("shareSuccess"), "success");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        await navigator.clipboard.writeText(url);
        showToast(t("shareSuccess"), "success");
      }
    }
  }, [detail, locale, postId, showToast, t]);

  const handleSignupPromptOpen = useCallback(() => {
    setShowSignupPrompt(true);
  }, []);

  if (isLoading || isInitializing) {
    return (
      <ChatLayout>
        <Loader centered size="large" />
      </ChatLayout>
    );
  }

  if (!detail) {
    return (
      <ChatLayout>
        <div className={styles.notFound}>
          <p>投稿が見つかりませんでした</p>
        </div>
      </ChatLayout>
    );
  }

  const isOwner = user?.id === detail.post.user_id;

  const footer =
    isAuthenticated && canReply ? (
      <SocialReplyForm onSubmit={handleReplySubmit} />
    ) : (
      <div className={styles.dummyReplyForm}>
        <div className={styles.dummyReplyInputWrapper}>
          <button
            type="button"
            className={styles.dummyReplyInput}
            onClick={
              isAuthenticated
                ? () => {
                    setUpgradeModalKey("premiumModalDailyLimit");
                    setShowUpgradeModal(true);
                  }
                : handleSignupPromptOpen
            }
          >
            {t("replyPlaceholder")}
          </button>
        </div>
      </div>
    );

  return (
    <ChatLayout footer={footer}>
      <SocialHeader
        title={t("detail")}
        onBack={isAuthenticated ? handleBack : undefined}
        backLabel={t("back")}
        right={
          isAuthenticated ? (
            <div className={styles.headerRight} ref={menuRef}>
              <Button
                className={styles.iconButton}
                onClick={() => setShowMenu((prev) => !prev)}
                aria-label="メニュー"
              >
                <DotsThreeVerticalIcon size={24} weight="bold" />
              </Button>
              {showMenu && (
                <div className={styles.menuDropdown}>
                  {isOwner ? (
                    <>
                      <button
                        type="button"
                        className={styles.menuItem}
                        onClick={handleStartEdit}
                      >
                        {t("menuEdit")}
                      </button>
                      <button
                        type="button"
                        className={`${styles.menuItem} ${styles.menuItemDanger}`}
                        onClick={() => {
                          setShowMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        {t("menuDelete")}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={() => {
                        setShowMenu(false);
                        setShowReportModal(true);
                      }}
                    >
                      {t("menuReport")}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : undefined
        }
      />

      <div className={styles.postContent}>
        <div className={styles.authorHeader}>
          {isAuthenticated ? (
            <a
              href={`/${locale}/social/profile/${detail.author.username}`}
              className={styles.authorLink}
            >
              <ProfileImage
                src={detail.author.profile_image_url}
                size="small"
              />
            </a>
          ) : (
            <button
              type="button"
              className={styles.authorButton}
              onClick={handleSignupPromptOpen}
            >
              <ProfileImage
                src={detail.author.profile_image_url}
                size="small"
              />
            </button>
          )}
          <div className={styles.authorInfo}>
            {isAuthenticated ? (
              <a
                href={`/${locale}/social/profile/${detail.author.username}`}
                className={styles.authorNameLink}
              >
                {detail.author.username}
              </a>
            ) : (
              <button
                type="button"
                className={styles.authorNameButton}
                onClick={handleSignupPromptOpen}
              >
                {detail.author.username}
              </button>
            )}
            <span className={styles.authorMeta}>
              {detail.author.aikido_rank && (
                <span>{detail.author.aikido_rank}</span>
              )}
              {detail.post.author_dojo_name && (
                <span>{detail.post.author_dojo_name}</span>
              )}
              <span>{formatToRelativeTime(detail.post.created_at)}</span>
            </span>
          </div>
        </div>

        {detail.source_page && detail.post.post_type === "training_record" ? (
          <div className={styles.notebookArea}>
            <h2 className={styles.notebookTitle}>{detail.source_page.title}</h2>
            {detail.source_page.tags.length > 0 && (
              <div className={styles.tags}>
                {detail.source_page.tags.map((tag) => (
                  <Tag key={`${tag.category}-${tag.name}`}>{tag.name}</Tag>
                ))}
              </div>
            )}
            <div className={styles.notebookContent}>
              {linkifyText(detail.source_page.content)}
            </div>
          </div>
        ) : (
          <p className={styles.text}>
            <HashtagText content={detail.post.content} locale={locale} />
          </p>
        )}

        {detail.attachments.length > 0 && (
          <SocialMediaGrid attachments={detail.attachments} />
        )}

        {detail.tags.length > 0 && (
          <div className={styles.tags}>
            {detail.tags.map((tag) => (
              <Tag key={tag.id}>{tag.name}</Tag>
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <Button
            className={`${styles.actionButton} ${detail.is_favorited ? styles.favorited : ""}`}
            onClick={handleFavoriteToggle}
          >
            <HeartIcon
              size={22}
              weight={detail.is_favorited ? "fill" : "regular"}
            />
            {isOwner &&
              detail.post.favorite_count !== undefined &&
              detail.post.favorite_count > 0 && (
                <span>{detail.post.favorite_count}</span>
              )}
          </Button>
          <Button className={styles.actionButton} onClick={handleShare}>
            <ShareFatIcon size={22} weight="regular" />
          </Button>
        </div>
      </div>

      <div className={styles.replies}>
        {detail.replies
          .filter(
            (r) => !r.is_deleted || isWithinDeleteDisplayWindow(r.updated_at),
          )
          .map((reply) =>
            reply.is_deleted ? (
              <DeletedReplyItem key={reply.id} reply={reply} />
            ) : (
              <SocialReplyItem
                key={reply.id}
                reply={reply}
                currentUserId={user?.id ?? ""}
                isAuthenticated={isAuthenticated}
                onReport={handleReplyReport}
                onEdit={handleReplyEdit}
                onDelete={handleReplyDelete}
                onFavoriteToggle={handleReplyFavoriteToggle}
                onUnauthenticatedAction={handleSignupPromptOpen}
                onBlock={isAuthenticated ? handleReplyBlock : undefined}
              />
            ),
          )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t("deleteConfirm")}
        message=""
        confirmLabel="削除"
        cancelLabel="キャンセル"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isProcessing={isDeleting}
      />

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportSubmit}
        title={t("reportTitle")}
      />

      <SignupPromptModal
        isOpen={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
      />

      <PremiumUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          setUpgradeModalKey("premiumModalBrowse");
        }}
        translationKey={upgradeModalKey}
      />
    </ChatLayout>
  );
}
