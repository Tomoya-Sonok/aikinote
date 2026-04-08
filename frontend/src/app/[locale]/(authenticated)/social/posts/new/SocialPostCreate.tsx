"use client";

import { ClipboardText } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AttachmentUpload } from "@/components/features/personal/AttachmentUpload/AttachmentUpload";
import { Button } from "@/components/shared/Button/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { HashtagTextarea } from "@/components/shared/HashtagTextarea/HashtagTextarea";
import { InitialTagLanguageDialog } from "@/components/shared/InitialTagLanguageDialog/InitialTagLanguageDialog";
import { SocialHeader } from "@/components/shared/layouts/SocialLayout/SocialHeader";
import { TagSectionWithNewInput } from "@/components/shared/TagSectionWithNewInput/TagSectionWithNewInput";
import { TextArea } from "@/components/shared/TextArea/TextArea";
import { TextInput } from "@/components/shared/TextInput/TextInput";
import { TitleTemplateModal } from "@/components/shared/TitleTemplateModal/TitleTemplateModal";
import type { TagLanguage } from "@/constants/tags";
import { useToast } from "@/contexts/ToastContext";
import {
  createPage,
  createSocialPost,
  isRateLimitError,
  upsertTrainingDateAttendance,
} from "@/lib/api/client";
import { useAttachmentManagement } from "@/lib/hooks/useAttachmentManagement";
import { useAuth } from "@/lib/hooks/useAuth";
import { useBeforeUnload } from "@/lib/hooks/useBeforeUnload";
import { useDailyLimits } from "@/lib/hooks/useDailyLimits";
import { useTagManagement } from "@/lib/hooks/useTagManagement";
import { useRouter } from "@/lib/i18n/routing";
import { formatToLocalDateString } from "@/lib/utils/dateUtils";
import styles from "./SocialPostCreate.module.css";

type CreateMode = "post" | "training";

const MAX_POST_CONTENT_LENGTH = 2000;

export function SocialPostCreate() {
  const { user } = useAuth();
  const t = useTranslations();
  const router = useRouter();
  const tSocial = useTranslations("socialPosts");
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const modeGroupId = useId();
  const titleInputRef = useRef<HTMLInputElement>(null);

  const { incrementPostCount } = useDailyLimits();

  const initialMode =
    searchParams.get("mode") === "training" ? "training" : "post";
  const [mode, setMode] = useState<CreateMode>(initialMode);

  // 投稿モード用
  const [postContent, setPostContent] = useState("");
  const postAttachmentMgmt = useAttachmentManagement("social-post");

  // 稽古記録モード用
  const trainingTitlePlaceholder = t("pageCreate.titlePlaceholder", {
    date: formatToLocalDateString(new Date().toISOString()),
  });
  const [trainingTitle, setTrainingTitle] = useState("");
  const [trainingContent, setTrainingContent] = useState("");
  const trainingAttachmentMgmt = useAttachmentManagement("page");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBackConfirmOpen, setIsBackConfirmOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTagLanguageDialogOpen, setIsTagLanguageDialogOpen] = useState(false);
  const [isInitializingTags, setIsInitializingTags] = useState(false);

  const tagManagement = useTagManagement({
    enabled: mode === "training",
  });

  // 初期タグ言語選択ダイアログ
  useEffect(() => {
    if (
      mode === "training" &&
      tagManagement.needsInitialTags &&
      !tagManagement.loading
    ) {
      setIsTagLanguageDialogOpen(true);
    }
  }, [mode, tagManagement.needsInitialTags, tagManagement.loading]);

  const handleTagLanguageConfirm = useCallback(
    async (language: TagLanguage) => {
      setIsInitializingTags(true);
      try {
        await tagManagement.initializeTags(language);
        setIsTagLanguageDialogOpen(false);
      } finally {
        setIsInitializingTags(false);
      }
    },
    [tagManagement],
  );

  // 稽古記録モード切り替え時にタイトルへフォーカス
  useEffect(() => {
    if (mode === "training" && titleInputRef.current) {
      const id = setTimeout(() => titleInputRef.current?.focus(), 100);
      return () => clearTimeout(id);
    }
  }, [mode]);

  // 未保存データの保護
  const hasUnsavedChanges = useCallback(() => {
    if (isNavigatingRef.current) return false;
    if (mode === "post") {
      return (
        postContent.trim() !== "" || postAttachmentMgmt.attachments.length > 0
      );
    }
    return (
      trainingTitle.trim() !== "" ||
      trainingContent.trim() !== "" ||
      trainingAttachmentMgmt.attachments.length > 0
    );
  }, [
    mode,
    postContent,
    postAttachmentMgmt.attachments,
    trainingTitle,
    trainingContent,
    trainingAttachmentMgmt.attachments,
  ]);
  const isNavigatingRef = useRef(false);
  useBeforeUnload(hasUnsavedChanges);

  // バリデーション
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (mode === "post") {
      if (!postContent.trim()) {
        newErrors.content = tSocial("contentRequired");
      } else if (postContent.length > MAX_POST_CONTENT_LENGTH) {
        newErrors.content = tSocial("contentTooLong");
      }
    } else {
      if (!trainingTitle.trim()) {
        newErrors.title = t("pageModal.titleRequired");
      } else if (trainingTitle.length > 35) {
        newErrors.title = t("pageModal.titleTooLong");
      }
      if (!trainingContent.trim()) {
        newErrors.content = t("pageModal.contentRequired");
      } else if (trainingContent.length > 3000) {
        newErrors.content = t("pageModal.contentTooLong");
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 投稿モード送信
  const handlePostSubmit = useCallback(async () => {
    if (!user?.id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await createSocialPost({
        user_id: user.id,
        content: postContent.trim(),
        post_type: "post",
      });

      if (result.success && result.data) {
        incrementPostCount();
        const postId = (result.data as { id: string }).id;
        await postAttachmentMgmt.saveNewAttachments(postId);
      }

      isNavigatingRef.current = true;
      router.replace("/social/posts");
    } catch (error) {
      showToast(
        tSocial(isRateLimitError(error) ? "postRateLimited" : "createFailed"),
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user?.id,
    postContent,
    isSubmitting,
    incrementPostCount,
    postAttachmentMgmt,
    showToast,
    tSocial,
    router,
  ]);

  // 稽古記録モード送信
  const handleTrainingSubmit = useCallback(async () => {
    if (!user?.id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await createPage({
        title: trainingTitle.trim(),
        tori: tagManagement.selectedTori,
        uke: tagManagement.selectedUke,
        waza: tagManagement.selectedWaza,
        content: trainingContent.trim(),
        user_id: user.id,
        is_public: true,
      });

      if (result.success) {
        const pageId = result.data?.page?.id;
        if (pageId) {
          await trainingAttachmentMgmt.saveNewAttachments(pageId);
        }

        try {
          const createdAt =
            result.data?.page?.created_at ?? new Date().toISOString();
          await upsertTrainingDateAttendance({
            userId: user.id,
            trainingDate: formatToLocalDateString(createdAt),
          });
        } catch (err) {
          console.warn("稽古参加の自動登録に失敗:", err);
        }

        isNavigatingRef.current = true;
        router.replace("/social/posts");
      } else {
        throw new Error(
          ("error" in result && result.error) || tSocial("createFailed"),
        );
      }
    } catch {
      showToast(tSocial("createFailed"), "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user?.id,
    isSubmitting,
    trainingTitle,
    trainingContent,
    tagManagement.selectedTori,
    tagManagement.selectedUke,
    tagManagement.selectedWaza,
    trainingAttachmentMgmt,
    showToast,
    tSocial,
    router,
  ]);

  const handleSubmit = () => {
    if (!validateForm()) return;
    if (mode === "post") {
      handlePostSubmit();
    } else {
      handleTrainingSubmit();
    }
  };

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges()) {
      setIsBackConfirmOpen(true);
    } else {
      isNavigatingRef.current = true;
      router.replace("/social/posts");
    }
  }, [hasUnsavedChanges, router]);

  const handleConfirmBack = useCallback(() => {
    setIsBackConfirmOpen(false);
    router.replace("/social/posts");
  }, [router]);

  const isDisabled =
    isSubmitting ||
    (mode === "post"
      ? !postContent.trim()
      : !trainingTitle.trim() || !trainingContent.trim());

  return (
    <div className={styles.layout}>
      <SocialHeader
        title={tSocial("createModalTitle")}
        onBack={handleBack}
        backLabel={tSocial("back")}
        right={
          <Button
            variant="primary"
            size="small"
            onClick={handleSubmit}
            disabled={isDisabled}
          >
            {isSubmitting
              ? tSocial("submitting")
              : mode === "post"
                ? tSocial("submit")
                : t("pageCreate.save")}
          </Button>
        }
      />

      <main className={styles.main}>
        {/* モード切り替え */}
        <div className={styles.section}>
          <span id={modeGroupId} className={styles.srOnly}>
            {tSocial("postType")}
          </span>
          <div
            className={styles.modeSelector}
            role="radiogroup"
            aria-labelledby={modeGroupId}
          >
            <label
              className={`${styles.modeButton} ${mode === "post" ? styles.modeActive : ""}`}
            >
              <input
                type="radio"
                name="createMode"
                value="post"
                checked={mode === "post"}
                onChange={() => setMode("post")}
                className={styles.modeRadio}
              />
              <span className={styles.modeText}>
                {tSocial("createTypePost")}
              </span>
            </label>
            <label
              className={`${styles.modeButton} ${mode === "training" ? styles.modeActive : ""}`}
            >
              <input
                type="radio"
                name="createMode"
                value="training"
                checked={mode === "training"}
                onChange={() => setMode("training")}
                className={styles.modeRadio}
              />
              <span className={styles.modeText}>
                {tSocial("createTypeTraining")}
              </span>
            </label>
          </div>
        </div>

        {/* 投稿モード */}
        {mode === "post" && (
          <>
            <div className={styles.section}>
              <HashtagTextarea
                className={styles.textarea}
                value={postContent}
                onChange={(e) =>
                  setPostContent(
                    e.target.value.slice(0, MAX_POST_CONTENT_LENGTH),
                  )
                }
                placeholder={tSocial("contentPlaceholder")}
                maxLength={MAX_POST_CONTENT_LENGTH}
                rows={8}
              />
              <span className={styles.charCount}>
                {tSocial("charCount", { count: postContent.length })}
              </span>
              {errors.content && (
                <span className={styles.errorText}>{errors.content}</span>
              )}
            </div>

            <div className={styles.section}>
              <AttachmentUpload
                attachments={postAttachmentMgmt.attachments}
                onAttachmentAdd={postAttachmentMgmt.handleAttachmentAdd}
                onAttachmentDelete={postAttachmentMgmt.handleAttachmentDelete}
                disabled={isSubmitting}
                uploadType="social-post-attachment"
              />
            </div>
          </>
        )}

        {/* 稽古記録モード */}
        {mode === "training" && (
          <>
            <div className={styles.section}>
              <div className={styles.titleRow}>
                <TextInput
                  ref={titleInputRef}
                  label={t("pageModal.title")}
                  required
                  value={trainingTitle}
                  placeholder={trainingTitlePlaceholder}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTrainingTitle(v);
                    if (v.length > 35) {
                      setErrors((prev) => ({
                        ...prev,
                        title: t("pageModal.titleTooLong"),
                      }));
                    } else {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.title;
                        return next;
                      });
                    }
                  }}
                  error={errors.title}
                  className={styles.titleInput}
                />
                <button
                  type="button"
                  className={styles.templateButton}
                  onClick={() => setIsTemplateModalOpen(true)}
                  aria-label={t("titleTemplate.insertFromTemplate")}
                >
                  <ClipboardText
                    width={40}
                    height={40}
                    weight="light"
                    color="var(--text-light)"
                  />
                </button>
              </div>
              <span className={styles.titleHint}>
                {t("titleTemplate.inputHint")}
              </span>
            </div>

            <TagSectionWithNewInput
              category="tori"
              titleKey="pageModal.tori"
              tags={tagManagement.toriTags}
              selectedTags={tagManagement.selectedTori}
              tagManagement={tagManagement}
            />
            <TagSectionWithNewInput
              category="uke"
              titleKey="pageModal.uke"
              tags={tagManagement.ukeTags}
              selectedTags={tagManagement.selectedUke}
              tagManagement={tagManagement}
            />
            <TagSectionWithNewInput
              category="waza"
              titleKey="pageModal.waza"
              tags={tagManagement.wazaTags}
              selectedTags={tagManagement.selectedWaza}
              tagManagement={tagManagement}
            />

            <div className={styles.section}>
              <TextArea
                label={t("pageModal.content")}
                required
                value={trainingContent}
                onChange={(e) => {
                  const v = e.target.value;
                  setTrainingContent(v);
                  if (v.length > 3000) {
                    setErrors((prev) => ({
                      ...prev,
                      content: t("pageModal.contentTooLong"),
                    }));
                  } else {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.content;
                      return next;
                    });
                  }
                }}
                placeholder={t("pageCreate.contentPlaceholder")}
                error={errors.content}
                rows={5}
              />
            </div>

            <div className={styles.section}>
              <AttachmentUpload
                attachments={trainingAttachmentMgmt.attachments}
                onAttachmentAdd={trainingAttachmentMgmt.handleAttachmentAdd}
                onAttachmentDelete={
                  trainingAttachmentMgmt.handleAttachmentDelete
                }
                disabled={isSubmitting}
              />
            </div>
          </>
        )}
      </main>

      <ConfirmDialog
        isOpen={isBackConfirmOpen}
        title={t("pageModal.closeConfirmTitle")}
        message={t("pageModal.closeConfirmMessage")}
        confirmLabel={t("pageModal.closeConfirmAction")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleConfirmBack}
        onCancel={() => setIsBackConfirmOpen(false)}
      />

      <TitleTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onInsert={(value) => setTrainingTitle(value)}
      />

      <InitialTagLanguageDialog
        isOpen={isTagLanguageDialogOpen}
        onConfirm={handleTagLanguageConfirm}
        isProcessing={isInitializingTags}
      />
    </div>
  );
}
