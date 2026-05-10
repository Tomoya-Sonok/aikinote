"use client";

import {
  ChatDotsIcon,
  DotsThreeVerticalIcon,
  HeartIcon,
  ShareFatIcon,
} from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { type FC, memo, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/shared/Button/Button";
import { HashtagText } from "@/components/shared/HashtagText/HashtagText";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import { Tag } from "@/components/shared/Tag/Tag";
import { useToast } from "@/contexts/ToastContext";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";
import { formatToRelativeTime } from "@/lib/utils/dateUtils";
import { buildShareUrl } from "@/lib/utils/share";
import { SocialMediaGrid } from "./SocialMediaGrid";
import styles from "./SocialPostCard.module.css";

const ReportModal = dynamic(
  () =>
    import("@/components/features/social/ReportModal/ReportModal").then(
      (m) => m.ReportModal,
    ),
  { ssr: false },
);

type ReportReason =
  | "spam"
  | "harassment"
  | "inappropriate"
  | "impersonation"
  | "other";

interface SocialPostAuthor {
  id: string;
  username: string;
  profile_image_url: string | null;
  aikido_rank: string | null;
}

interface SocialPostAttachment {
  id: string;
  type: string;
  url: string;
  thumbnail_url: string | null;
  original_filename: string | null;
}

interface SocialPostTag {
  id: string;
  name: string;
  category: string;
}

export interface SocialFeedPostData {
  id: string;
  user_id: string;
  content: string;
  post_type: string;
  author_dojo_name: string | null;
  favorite_count?: number;
  reply_count: number;
  created_at: string;
  author: SocialPostAuthor;
  attachments: SocialPostAttachment[];
  tags: SocialPostTag[];
  hashtags?: { id: string; name: string }[];
  is_favorited: boolean;
  source_page_id?: string | null;
  source_page_title?: string | null;
  source_page_tags?: { name: string; category: string }[];
}

interface SocialPostCardProps {
  post: SocialFeedPostData;
  currentUserId: string;
  hasUnreadReplies?: boolean;
  onFavoriteToggle: (postId: string) => void;
  onClick: (postId: string) => void;
  /**
   * 通報送信時のハンドラ。指定された場合のみ、自分以外の投稿に kebab メニュー +
   * 「通報する」項目が表示される。Apple App Review Guideline 1.2 (UGC) 対応。
   */
  onReport?: (postId: string, reason: ReportReason, detail?: string) => void;
  /**
   * ユーザーブロック時のハンドラ。指定された場合のみ kebab メニューに「ブロックする」項目が表示される。
   * 引数の username は確認ダイアログの文言用に親側で利用。Apple App Review Guideline 1.2 (UGC) 対応。
   */
  onBlock?: (blockedUserId: string, username: string) => void;
}

export const SocialPostCard: FC<SocialPostCardProps> = memo(
  function SocialPostCard({
    post,
    currentUserId,
    hasUnreadReplies,
    onFavoriteToggle,
    onClick,
    onReport,
    onBlock,
  }) {
    const t = useTranslations("socialPosts");
    const locale = useLocale();
    const { showToast } = useToast();
    const { track } = useUmamiTrack();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTruncated, setIsTruncated] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const textRef = useRef<HTMLParagraphElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const isOwner = post.user_id === currentUserId;
    const showMenuButton = !isOwner && (!!onReport || !!onBlock);

    // ResizeObserverでtruncation検出（layout thrashing回避）
    useEffect(() => {
      const el = textRef.current;
      if (!el) return;

      const observer = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          setIsTruncated(el.scrollHeight > el.clientHeight);
        });
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

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

    const handleReportSubmit = useCallback(
      (reason: ReportReason, detail?: string) => {
        onReport?.(post.id, reason, detail);
        setShowReportModal(false);
      },
      [onReport, post.id],
    );

    const handleShare = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation();
        track("social_post_share");
        const url = buildShareUrl(`/${locale}/social/posts/${post.id}`);
        const shareData = {
          title: "AikiNote",
          text: post.content.slice(0, 100),
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
      },
      [track, locale, post.id, post.content, showToast, t],
    );

    return (
      // biome-ignore lint/a11y/useSemanticElements: Using div with role="button" because <button> causes hydration error with nested Button components
      <div
        className={styles.card}
        role="button"
        tabIndex={0}
        onClick={() => onClick(post.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(post.id);
          }
        }}
      >
        <div className={styles.authorHeader}>
          <a
            href={`/${locale}/social/profile/${post.author.username}`}
            className={styles.authorLink}
            onClick={(e) => e.stopPropagation()}
          >
            <ProfileImage src={post.author.profile_image_url} size="small" />
          </a>
          <div className={styles.authorInfo}>
            <a
              href={`/${locale}/social/profile/${post.author.username}`}
              className={styles.authorNameLink}
              onClick={(e) => e.stopPropagation()}
            >
              {post.author.username}
            </a>
            <span className={styles.authorMeta}>
              {post.author_dojo_name && (
                <span className={styles.dojoName}>{post.author_dojo_name}</span>
              )}
              <span className={styles.timestamp}>
                {formatToRelativeTime(post.created_at)}
              </span>
            </span>
          </div>
          {showMenuButton && (
            <div className={styles.menuWrapper} ref={menuRef}>
              <button
                type="button"
                className={styles.menuButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu((prev) => !prev);
                }}
                aria-label={t("menuReport")}
              >
                <DotsThreeVerticalIcon size={16} weight="bold" />
              </button>
              {showMenu && (
                <div className={styles.menuDropdown}>
                  {onReport && (
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        setShowReportModal(true);
                      }}
                    >
                      {t("menuReport")}
                    </button>
                  )}
                  {onBlock && (
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onBlock(post.user_id, post.author.username);
                      }}
                    >
                      {t("menuBlock")}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.content}>
          {post.post_type === "training_record" && post.source_page_title ? (
            <>
              <p className={styles.trainingTitle}>{post.source_page_title}</p>
              {post.source_page_tags && post.source_page_tags.length > 0 && (
                <div className={styles.tags}>
                  {post.source_page_tags.map((tag) => (
                    <Tag key={`${tag.category}-${tag.name}`}>{tag.name}</Tag>
                  ))}
                </div>
              )}
              <p
                ref={textRef}
                className={`${styles.text} ${isExpanded ? styles.textExpanded : ""}`}
              >
                <HashtagText content={post.content} locale={locale} />
              </p>
            </>
          ) : (
            <p
              ref={textRef}
              className={`${styles.text} ${isExpanded ? styles.textExpanded : ""}`}
            >
              <HashtagText content={post.content} locale={locale} />
            </p>
          )}
          {(isTruncated || isExpanded) && (
            <button
              type="button"
              className={styles.showMoreButton}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
            >
              {isExpanded ? t("showLess") : t("showMore")}
            </button>
          )}
        </div>

        {post.attachments.length > 0 && (
          <SocialMediaGrid attachments={post.attachments} />
        )}

        {post.tags.length > 0 && (
          <div className={styles.tags}>
            {post.tags.map((tag) => (
              <Tag key={tag.id}>{tag.name}</Tag>
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <Button
            className={styles.actionButton}
            onClick={(e) => {
              e.stopPropagation();
              onClick(post.id);
            }}
            aria-label={t("reply")}
          >
            <span className={styles.iconWrapper}>
              <ChatDotsIcon size={20} weight="regular" />
              {hasUnreadReplies && <span className={styles.badge} />}
            </span>
            {post.reply_count > 0 && (
              <span className={styles.count}>{post.reply_count}</span>
            )}
          </Button>

          <Button
            className={`${styles.actionButton} ${post.is_favorited ? styles.favorited : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle(post.id);
            }}
            aria-label={t("favorite")}
          >
            <HeartIcon
              size={20}
              weight={post.is_favorited ? "fill" : "regular"}
            />
            {post.user_id === currentUserId &&
              post.favorite_count !== undefined &&
              post.favorite_count > 0 && (
                <span className={styles.count}>{post.favorite_count}</span>
              )}
          </Button>

          <Button
            className={styles.actionButton}
            onClick={handleShare}
            aria-label={t("share")}
          >
            <ShareFatIcon size={20} weight="regular" />
          </Button>
        </div>

        {showMenuButton && (
          <ReportModal
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            onSubmit={handleReportSubmit}
            title={t("reportTitle")}
          />
        )}
      </div>
    );
  },
);
