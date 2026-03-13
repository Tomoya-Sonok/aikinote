"use client";

import { ChatDotsIcon, HeartIcon, ShareFatIcon } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { type FC, memo, useCallback } from "react";
import { Button } from "@/components/shared/Button/Button";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import { Tag } from "@/components/shared/Tag/Tag";
import { useToast } from "@/contexts/ToastContext";
import { formatToRelativeTime } from "@/lib/utils/dateUtils";
import { SocialMediaGrid } from "./SocialMediaGrid";
import styles from "./SocialPostCard.module.css";

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
  is_favorited: boolean;
}

interface SocialPostCardProps {
  post: SocialFeedPostData;
  currentUserId: string;
  hasUnreadReplies?: boolean;
  onFavoriteToggle: (postId: string) => void;
  onClick: (postId: string) => void;
}

export const SocialPostCard: FC<SocialPostCardProps> = memo(
  function SocialPostCard({
    post,
    currentUserId,
    hasUnreadReplies,
    onFavoriteToggle,
    onClick,
  }) {
    const t = useTranslations("socialPosts");
    const locale = useLocale();
    const { showToast } = useToast();

    const handleShare = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}/${locale}/social/posts/${post.id}`;
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
      [locale, post.id, post.content, showToast, t],
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
            href={`/${locale}/social/profile/${post.author.id}`}
            className={styles.authorLink}
            onClick={(e) => e.stopPropagation()}
          >
            <ProfileImage src={post.author.profile_image_url} size="small" />
          </a>
          <div className={styles.authorInfo}>
            <a
              href={`/${locale}/social/profile/${post.author.id}`}
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
        </div>

        <div className={styles.content}>
          <p className={styles.text}>{post.content}</p>
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
      </div>
    );
  },
);
