"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { AttachmentData } from "@/components/features/personal/AttachmentCard/AttachmentCard";
import { AttachmentUpload } from "@/components/features/personal/AttachmentUpload/AttachmentUpload";
import { Button } from "@/components/shared/Button/Button";
import {
  SocialHeader,
  SocialLayout,
} from "@/components/shared/layouts/SocialLayout";
import { TagSelection } from "@/components/shared/TagSelection/TagSelection";
import { useToast } from "@/contexts/ToastContext";
import { createSocialPost, getTags } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./SocialPostCreate.module.css";

const MAX_CONTENT_LENGTH = 2000;

interface UserTag {
  id: string;
  name: string;
  category: string;
}

export function SocialPostCreate() {
  const { user } = useAuth();
  const locale = useLocale();
  const t = useTranslations("socialPosts");
  const { showToast } = useToast();
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"post" | "training_record">("post");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchTags = async () => {
      try {
        const result = await getTags(user.id);
        if (result.success && result.data) {
          setUserTags(result.data as UserTag[]);
        }
      } catch {
        // タグ取得失敗は致命的ではない
      }
    };
    fetchTags();
  }, [user?.id]);

  const handleBack = useCallback(() => {
    window.location.href = `/${locale}/social/posts`;
  }, [locale]);

  const handleAttachmentAdd = useCallback((attachment: AttachmentData) => {
    setAttachments((prev) => [...prev, attachment]);
  }, []);

  const handleAttachmentDelete = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleTagToggle = useCallback((tagName: string) => {
    setSelectedTagNames((prev) =>
      prev.includes(tagName)
        ? prev.filter((n) => n !== tagName)
        : [...prev, tagName],
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user?.id || !content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // タグ名からIDに変換
      const tagIds = userTags
        .filter((tag) => selectedTagNames.includes(tag.name))
        .map((tag) => tag.id);

      // 投稿を作成
      const result = await createSocialPost({
        user_id: user.id,
        content: content.trim(),
        post_type: postType,
        tag_ids: tagIds.length > 0 ? tagIds : undefined,
      });

      // 添付ファイルのメタデータを保存
      if (result.success && result.data && attachments.length > 0) {
        const postId = (result.data as { id: string }).id;
        for (let i = 0; i < attachments.length; i++) {
          const att = attachments[i];
          const fileKey = (att as unknown as Record<string, string>)._fileKey;
          try {
            await fetch("/api/social-post-attachments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                post_id: postId,
                type: att.type,
                file_key: fileKey || undefined,
                url: att.type === "youtube" ? att.url : undefined,
                original_filename: att.original_filename || undefined,
                file_size_bytes: att.file_size_bytes || undefined,
                sort_order: i,
              }),
            });
          } catch {
            // 個別の添付保存失敗は投稿自体を失敗にしない
          }
        }
      }

      showToast(t("createSuccess"), "success");
      window.location.href = `/${locale}/social/posts`;
    } catch {
      showToast(t("createFailed"), "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user?.id,
    content,
    postType,
    isSubmitting,
    locale,
    showToast,
    t,
    userTags,
    selectedTagNames,
    attachments,
  ]);

  const isDisabled = !content.trim() || isSubmitting;

  // タグをカテゴリごとに整理
  const wazaTags = userTags
    .filter((tag) => tag.category === "技")
    .map((tag) => tag.name);

  return (
    <SocialLayout>
      <SocialHeader
        title={t("newPost")}
        onBack={handleBack}
        backLabel={t("back")}
        right={
          <Button
            variant="primary"
            size="small"
            onClick={handleSubmit}
            disabled={isDisabled}
          >
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        }
      />

      <div className={styles.form}>
        <div className={styles.textareaWrapper}>
          <textarea
            className={styles.textarea}
            value={content}
            onChange={(e) =>
              setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))
            }
            placeholder={t("contentPlaceholder")}
            maxLength={MAX_CONTENT_LENGTH}
            rows={8}
          />
          <span className={styles.charCount}>
            {t("charCount", { count: content.length })}
          </span>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionLabel}>{t("postType")}</span>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="postType"
                value="post"
                checked={postType === "post"}
                onChange={() => setPostType("post")}
                className={styles.radioInput}
              />
              <span>{t("postTypePost")}</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="postType"
                value="training_record"
                checked={postType === "training_record"}
                onChange={() => setPostType("training_record")}
                className={styles.radioInput}
              />
              <span>{t("postTypeTraining")}</span>
            </label>
          </div>
        </div>

        {wazaTags.length > 0 && (
          <div className={styles.section}>
            <TagSelection
              title={t("tags")}
              tags={wazaTags}
              selectedTags={selectedTagNames}
              onTagToggle={handleTagToggle}
              showAddButton={false}
            />
          </div>
        )}

        <div className={styles.section}>
          <AttachmentUpload
            attachments={attachments}
            onAttachmentAdd={handleAttachmentAdd}
            onAttachmentDelete={handleAttachmentDelete}
            disabled={isSubmitting}
            uploadType="social-post-attachment"
          />
        </div>
      </div>
    </SocialLayout>
  );
}
