"use client";

import { ClipboardText, PlusCircle } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { AttachmentUpload } from "@/components/features/personal/AttachmentUpload/AttachmentUpload";
import {
  createEmptyMemo,
  type MemoDraft,
  TagMemoEditor,
} from "@/components/features/personal/TagMemoEditor/TagMemoEditor";
import { Button } from "@/components/shared/Button/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { HashtagTextarea } from "@/components/shared/HashtagTextarea/HashtagTextarea";
import { InitialTagLanguageDialog } from "@/components/shared/InitialTagLanguageDialog/InitialTagLanguageDialog";
import { InputModeToggle } from "@/components/shared/InputModeToggle/InputModeToggle";
import { SocialHeader } from "@/components/shared/layouts/SocialLayout/SocialHeader";
import { OfflineHint } from "@/components/shared/OfflineHint/OfflineHint";
import { TagSectionWithNewInput } from "@/components/shared/TagSectionWithNewInput/TagSectionWithNewInput";
import { TextArea } from "@/components/shared/TextArea/TextArea";
import { TextInput } from "@/components/shared/TextInput/TextInput";
import { TitleTemplateModal } from "@/components/shared/TitleTemplateModal/TitleTemplateModal";
import { MAX_CATEGORIES, type TagLanguage } from "@/constants/tags";
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
import { getNetworkAwareErrorMessage } from "@/lib/utils/offlineError";
import {
  buildAvailableTags,
  memoStatusOf,
  pruneMemoTags,
  toMemoPayloads,
} from "@/lib/utils/tagMemo";
import {
  type PageInputMode,
  usePageInputModeStore,
} from "@/stores/pageInputModeStore";
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
  const queryClient = useQueryClient();
  const modeGroupId = useId();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const postTextareaRef = useRef<HTMLTextAreaElement>(null);

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
  // #280 入力モード（前回選択を記憶。ひとりでのページ作成と共有）とタグごとのメモ
  const lastMode = usePageInputModeStore((s) => s.lastMode);
  const setLastMode = usePageInputModeStore((s) => s.setLastMode);
  const [inputMode, setInputMode] = useState<PageInputMode>(lastMode);
  const [trainingMemos, setTrainingMemos] = useState<MemoDraft[]>(() => [
    createEmptyMemo(),
  ]);
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

  // タグごとのメモの候補タグ（カテゴリ側で選択済みのタグ）
  const availableTags = useMemo(
    () =>
      buildAvailableTags(
        tagManagement.categories,
        tagManagement.selectedByCategory,
      ),
    [tagManagement.categories, tagManagement.selectedByCategory],
  );

  // カテゴリ側でタグ選択が解除されたら、メモからもそのタグを取り除く
  useEffect(() => {
    setTrainingMemos((prev) => pruneMemoTags(prev, availableTags));
  }, [availableTags]);

  // カテゴリ追加
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const canAddCategory = tagManagement.categories.length < MAX_CATEGORIES;

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

  // モード切り替え時に先頭の入力欄へフォーカス
  useEffect(() => {
    if (mode === "training" && titleInputRef.current) {
      const id = setTimeout(() => titleInputRef.current?.focus(), 100);
      return () => clearTimeout(id);
    }
    if (mode === "post" && postTextareaRef.current) {
      const id = setTimeout(() => postTextareaRef.current?.focus(), 100);
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
      trainingMemos.some((m) => m.content.trim() !== "" || m.tags.length > 0) ||
      trainingAttachmentMgmt.attachments.length > 0
    );
  }, [
    mode,
    postContent,
    postAttachmentMgmt.attachments,
    trainingTitle,
    trainingContent,
    trainingMemos,
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
      if (inputMode === "tag_based") {
        const statuses = trainingMemos.map(memoStatusOf);
        if (statuses.includes("partial")) {
          newErrors.memos = t("pageCreate.memoIncomplete");
        } else if (!statuses.includes("complete")) {
          newErrors.memos = t("pageCreate.memoRequired");
        }
      } else if (!trainingContent.trim()) {
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

        // 投稿一覧 (useSocialFeed) のキャッシュを無効化して、遷移先で
        // 作成したばかりの投稿が反映されるようにする。staleTime に関係なく
        // 強制 refetch されるため、staleTime 延長による表示遅延を防ぐ。
        queryClient.invalidateQueries({ queryKey: ["social-feed"] });
      }

      if (result.success && result.warning) {
        showToast(result.warning, "error");
      }

      isNavigatingRef.current = true;
      router.replace("/social/posts");
    } catch (error) {
      const fallback = tSocial(
        isRateLimitError(error) ? "postRateLimited" : "createFailed",
      );
      showToast(getNetworkAwareErrorMessage(error, fallback), "error");
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
    queryClient,
  ]);

  // 稽古記録モード送信
  const handleTrainingSubmit = useCallback(async () => {
    if (!user?.id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await createPage(
        inputMode === "tag_based"
          ? {
              title: trainingTitle.trim(),
              content_mode: "tag_based",
              memos: toMemoPayloads(trainingMemos),
              user_id: user.id,
              is_public: true,
            }
          : (() => {
              // 動的カテゴリからtagsペイロードを構築
              const tags: Record<string, string[]> = {};
              for (const cat of tagManagement.categories) {
                const selected =
                  tagManagement.selectedByCategory[cat.name] ?? [];
                if (selected.length > 0) tags[cat.name] = selected;
              }
              return {
                title: trainingTitle.trim(),
                tags,
                content: trainingContent.trim(),
                content_mode: "free" as const,
                user_id: user.id,
                is_public: true,
              };
            })(),
      );

      if (result.success) {
        // 次回の作成で同じ入力モードを初期表示する
        setLastMode(inputMode);

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

        // 稽古記録モードは is_public=true でページ + 連動 SocialPost を作成するため、
        // ページ一覧と投稿一覧の両キャッシュを無効化する。
        queryClient.invalidateQueries({ queryKey: ["training-pages"] });
        queryClient.invalidateQueries({ queryKey: ["social-feed"] });

        isNavigatingRef.current = true;
        router.replace("/social/posts");
      } else {
        throw new Error(
          ("error" in result && result.error) || tSocial("createFailed"),
        );
      }
    } catch (error) {
      showToast(
        getNetworkAwareErrorMessage(error, tSocial("createFailed")),
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user?.id,
    isSubmitting,
    trainingTitle,
    trainingContent,
    inputMode,
    trainingMemos,
    setLastMode,
    tagManagement.categories,
    tagManagement.selectedByCategory,
    trainingAttachmentMgmt,
    showToast,
    tSocial,
    router,
    queryClient,
  ]);

  const handleAddCategory = async () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    setIsCreatingCategory(true);
    try {
      await tagManagement.handleCreateCategory(trimmed);
      setNewCategoryInput("");
      setShowAddCategory(false);
    } finally {
      setIsCreatingCategory(false);
    }
  };

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

  const trainingHasCompleteMemo = trainingMemos.some(
    (m) => memoStatusOf(m) === "complete",
  );
  const trainingHasPartialMemo = trainingMemos.some(
    (m) => memoStatusOf(m) === "partial",
  );
  const isDisabled =
    isSubmitting ||
    (mode === "post"
      ? !postContent.trim()
      : !trainingTitle.trim() ||
        (inputMode === "tag_based"
          ? availableTags.length === 0 ||
            !trainingHasCompleteMemo ||
            trainingHasPartialMemo
          : !trainingContent.trim()));

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
            {isSubmitting ? tSocial("submitting") : tSocial("submit")}
          </Button>
        }
      />

      <main className={styles.main}>
        <OfflineHint />
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
                textareaRef={postTextareaRef}
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
                  onBlur={() => {
                    setErrors((prev) => {
                      const next = { ...prev };
                      if (!trainingTitle.trim()) {
                        next.title = t("pageCreate.requiredOnBlur", {
                          field: t("pageModal.title"),
                        });
                      } else if (trainingTitle.length <= 35) {
                        delete next.title;
                      }
                      return next;
                    });
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

            {tagManagement.categories.map((cat) => (
              <TagSectionWithNewInput
                key={cat.slug}
                category={cat.name}
                title={cat.is_default ? t(`pageModal.${cat.slug}`) : cat.name}
                tags={tagManagement.tagsByCategory[cat.name] ?? []}
                selectedTags={tagManagement.selectedByCategory[cat.name] ?? []}
                tagManagement={tagManagement}
              />
            ))}

            {/* カテゴリ追加 */}
            <div className={styles.addCategoryWrapper}>
              <div className={styles.addCategoryArea}>
                {showAddCategory ? (
                  <div className={styles.addCategoryForm}>
                    <input
                      type="text"
                      className={styles.addCategoryInput}
                      placeholder={t("tagManagement.categoryNamePlaceholder")}
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setShowAddCategory(false);
                          setNewCategoryInput("");
                        }
                      }}
                      maxLength={10}
                      disabled={isCreatingCategory}
                    />
                    <Button
                      variant="cancel"
                      size="small"
                      onClick={() => {
                        setShowAddCategory(false);
                        setNewCategoryInput("");
                      }}
                    >
                      {t("tagFilterModal.cancel")}
                    </Button>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={handleAddCategory}
                      disabled={isCreatingCategory || !newCategoryInput.trim()}
                    >
                      {t("pageModal.add")}
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.addCategoryButton}
                    onClick={() => setShowAddCategory(true)}
                    disabled={!canAddCategory}
                  >
                    <PlusCircle size={16} weight="light" />
                    {t("tagManagement.addCategory")}
                  </button>
                )}
              </div>
              <div className={styles.skeletonTags}>
                <span className={styles.skeletonTag} style={{ width: 48 }} />
                <span className={styles.skeletonTag} style={{ width: 64 }} />
                <span className={styles.skeletonTag} style={{ width: 40 }} />
              </div>
            </div>

            <div className={styles.section}>
              <span className={styles.contentLabel}>
                {t("pageModal.content")}
                <span className={styles.required} aria-hidden="true">
                  *
                </span>
              </span>
              <InputModeToggle mode={inputMode} onChange={setInputMode} />
            </div>

            {inputMode === "tag_based" ? (
              <div className={styles.section}>
                <TagMemoEditor
                  availableTags={availableTags}
                  memos={trainingMemos}
                  onChange={setTrainingMemos}
                  contentRequiredMessage={t("pageCreate.requiredOnBlur", {
                    field: t("pageModal.content"),
                  })}
                />
                {errors.memos && (
                  <span className={styles.errorText}>{errors.memos}</span>
                )}
              </div>
            ) : (
              <div className={styles.section}>
                <TextArea
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
                  onBlur={() => {
                    setErrors((prev) => {
                      const next = { ...prev };
                      if (!trainingContent.trim()) {
                        next.content = t("pageCreate.requiredOnBlur", {
                          field: t("pageModal.content"),
                        });
                      } else if (trainingContent.length <= 3000) {
                        delete next.content;
                      }
                      return next;
                    });
                  }}
                  placeholder={t("pageCreate.contentPlaceholder")}
                  error={errors.content}
                  rows={5}
                />
              </div>
            )}

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
        onInsert={(value) => {
          setTrainingTitle(value);
          setErrors((prev) => {
            const next = { ...prev };
            if (value.trim() && value.length <= 35) {
              delete next.title;
            }
            return next;
          });
        }}
      />

      <InitialTagLanguageDialog
        isOpen={isTagLanguageDialogOpen}
        onConfirm={handleTagLanguageConfirm}
        isProcessing={isInitializingTags}
      />
    </div>
  );
}
