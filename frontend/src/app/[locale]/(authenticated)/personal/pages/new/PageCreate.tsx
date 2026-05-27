"use client";

import { ClipboardText, PlusCircle } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AttachmentUpload } from "@/components/features/personal/AttachmentUpload/AttachmentUpload";
import {
  createEmptyMemo,
  type MemoDraft,
  TagMemoEditor,
} from "@/components/features/personal/TagMemoEditor/TagMemoEditor";
import { Button } from "@/components/shared/Button/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
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
  type CreatePagePayload,
  createPage,
  upsertTrainingDateAttendance,
} from "@/lib/api/client";
import { useAttachmentManagement } from "@/lib/hooks/useAttachmentManagement";
import { useAuth } from "@/lib/hooks/useAuth";
import { useBeforeUnload } from "@/lib/hooks/useBeforeUnload";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
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
import styles from "./PageCreate.module.css";

export function PageCreate() {
  const { user } = useAuth();
  const t = useTranslations();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const returnUrl = searchParams.get("returnUrl") || "/personal/pages";
  const dateParam = searchParams.get("date");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  // #280 入力モード（前回選択を記憶）とタグごとのメモ下書き
  const lastMode = usePageInputModeStore((s) => s.lastMode);
  const setLastMode = usePageInputModeStore((s) => s.setLastMode);
  const [mode, setMode] = useState<PageInputMode>(lastMode);
  const [memos, setMemos] = useState<MemoDraft[]>(() => [createEmptyMemo()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBackConfirmOpen, setIsBackConfirmOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTagLanguageDialogOpen, setIsTagLanguageDialogOpen] = useState(false);
  const [isInitializingTags, setIsInitializingTags] = useState(false);

  const tagManagement = useTagManagement();
  const attachmentMgmt = useAttachmentManagement("page");
  const isOnline = useOnlineStatus();

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
    setMemos((prev) => pruneMemoTags(prev, availableTags));
  }, [availableTags]);

  // カテゴリ追加
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const canAddCategory = tagManagement.categories.length < MAX_CATEGORIES;

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

  // タイトルプレースホルダー
  const placeholderDateIso = dateParam
    ? new Date(`${dateParam}T00:00:00`).toISOString()
    : new Date().toISOString();
  const titlePlaceholder = t("pageCreate.titlePlaceholder", {
    date: formatToLocalDateString(placeholderDateIso),
  });

  // 初期タグ言語選択ダイアログ
  useEffect(() => {
    if (tagManagement.needsInitialTags && !tagManagement.loading) {
      setIsTagLanguageDialogOpen(true);
    }
  }, [tagManagement.needsInitialTags, tagManagement.loading]);

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

  // 自動フォーカス
  useEffect(() => {
    const id = setTimeout(() => titleInputRef.current?.focus(), 100);
    return () => clearTimeout(id);
  }, []);

  // 未保存データの保護（意図的な遷移時は無効化）
  const isNavigatingRef = useRef(false);
  const hasUnsavedChanges = useCallback(
    () =>
      !isNavigatingRef.current &&
      (title.trim() !== "" ||
        content.trim() !== "" ||
        memos.some((m) => m.content.trim() !== "" || m.tags.length > 0) ||
        attachmentMgmt.attachments.length > 0),
    [title, content, memos, attachmentMgmt.attachments],
  );
  useBeforeUnload(hasUnsavedChanges);

  // バリデーション
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = t("pageModal.titleRequired");
    } else if (title.length > 35) {
      newErrors.title = t("pageModal.titleTooLong");
    }
    if (mode === "tag_based") {
      const statuses = memos.map(memoStatusOf);
      if (statuses.includes("partial")) {
        newErrors.memos = t("pageCreate.memoIncomplete");
      } else if (!statuses.includes("complete")) {
        newErrors.memos = t("pageCreate.memoRequired");
      }
    } else if (!content.trim()) {
      newErrors.content = t("pageModal.contentRequired");
    } else if (content.length > 3000) {
      newErrors.content = t("pageModal.contentTooLong");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, content, mode, memos, t]);

  const handleSubmit = useCallback(async () => {
    if (!user?.id || isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const createdAtField = dateParam
        ? { created_at: `${dateParam}T00:00:00.000Z` }
        : {};

      let pagePayload: CreatePagePayload;
      if (mode === "tag_based") {
        // tag_based: 本文は memos に持つ（content は空でバックエンドが '' を保存）
        pagePayload = {
          title: title.trim(),
          content_mode: "tag_based",
          memos: toMemoPayloads(memos),
          user_id: user.id,
          is_public: false,
          ...createdAtField,
        };
      } else {
        // free: 動的カテゴリから tags ペイロードを構築
        const tags: Record<string, string[]> = {};
        for (const cat of tagManagement.categories) {
          const selected = tagManagement.selectedByCategory[cat.name] ?? [];
          if (selected.length > 0) tags[cat.name] = selected;
        }
        pagePayload = {
          title: title.trim(),
          tags,
          content: content.trim(),
          content_mode: "free",
          user_id: user.id,
          is_public: false,
          ...createdAtField,
        };
      }

      const result = await createPage(pagePayload);

      if (result.success) {
        // 次回の新規作成で同じモードを初期表示する
        setLastMode(mode);

        const pageId = result.data?.page?.id;
        if (pageId) {
          await attachmentMgmt.saveNewAttachments(pageId);
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

        // 一覧画面 (useTrainingPagesData) のキャッシュを無効化して、
        // 遷移先で作成したばかりのページが反映されるようにする。
        // staleTime に関係なく強制 refetch されるため、staleTime 延長による
        // 表示遅延（PR #273）の回帰を防ぐ。
        queryClient.invalidateQueries({ queryKey: ["training-pages"] });

        isNavigatingRef.current = true;
        router.replace(returnUrl);
      } else {
        throw new Error(
          ("error" in result && result.error) || "作成に失敗しました",
        );
      }
    } catch (error) {
      showToast(
        getNetworkAwareErrorMessage(
          error,
          t("pageCreate.createFailed") || "作成に失敗しました",
        ),
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user?.id,
    isSubmitting,
    validateForm,
    title,
    content,
    mode,
    memos,
    setLastMode,
    tagManagement.categories,
    tagManagement.selectedByCategory,
    attachmentMgmt,
    showToast,
    t,
    returnUrl,
    dateParam,
    router,
    queryClient,
  ]);

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges()) {
      setIsBackConfirmOpen(true);
    } else {
      router.replace(returnUrl);
    }
  }, [hasUnsavedChanges, returnUrl, router]);

  const handleConfirmBack = useCallback(() => {
    setIsBackConfirmOpen(false);
    isNavigatingRef.current = true;
    router.replace(returnUrl);
  }, [returnUrl, router]);

  const hasCompleteMemo = memos.some((m) => memoStatusOf(m) === "complete");
  const hasPartialMemo = memos.some((m) => memoStatusOf(m) === "partial");
  const isDisabled =
    isSubmitting ||
    !title.trim() ||
    (mode === "tag_based"
      ? availableTags.length === 0 || !hasCompleteMemo || hasPartialMemo
      : !content.trim());

  return (
    <div className={styles.layout}>
      <SocialHeader
        title={t("pageCreate.title")}
        onBack={handleBack}
        backLabel={t("socialPosts.back")}
        right={
          <Button
            variant="primary"
            size="small"
            onClick={handleSubmit}
            disabled={isDisabled}
          >
            {isSubmitting ? "..." : t("pageCreate.save")}
          </Button>
        }
      />

      <main className={styles.main}>
        <OfflineHint />
        <div className={styles.section}>
          <div className={styles.titleRow}>
            <TextInput
              ref={titleInputRef}
              label={t("pageModal.title")}
              required
              value={title}
              placeholder={titlePlaceholder}
              onChange={(e) => {
                const v = e.target.value;
                setTitle(v);
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
                  disabled={
                    isCreatingCategory || !newCategoryInput.trim() || !isOnline
                  }
                  title={
                    !isOnline
                      ? t("offlineGuard.actionRequiresNetwork")
                      : undefined
                  }
                >
                  {t("pageModal.add")}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.addCategoryButton}
                onClick={() => setShowAddCategory(true)}
                disabled={!canAddCategory || !isOnline}
                title={
                  !isOnline
                    ? t("offlineGuard.actionRequiresNetwork")
                    : undefined
                }
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
          <span className={styles.contentLabel}>{t("pageModal.content")}</span>
          <InputModeToggle mode={mode} onChange={setMode} />
        </div>

        {mode === "tag_based" ? (
          <div className={styles.section}>
            <TagMemoEditor
              availableTags={availableTags}
              memos={memos}
              onChange={setMemos}
            />
            {errors.memos && (
              <span className={styles.errorText}>{errors.memos}</span>
            )}
          </div>
        ) : (
          <div className={styles.section}>
            <TextArea
              value={content}
              placeholder={t("pageCreate.contentPlaceholder")}
              onChange={(e) => {
                const v = e.target.value;
                setContent(v);
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
              error={errors.content}
              rows={5}
            />
          </div>
        )}

        <div className={styles.section}>
          <AttachmentUpload
            attachments={attachmentMgmt.attachments}
            onAttachmentAdd={attachmentMgmt.handleAttachmentAdd}
            onAttachmentDelete={attachmentMgmt.handleAttachmentDelete}
            disabled={isSubmitting}
          />
        </div>
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
        onInsert={(value) => setTitle(value)}
        dateOverride={dateParam || undefined}
      />

      <InitialTagLanguageDialog
        isOpen={isTagLanguageDialogOpen}
        onConfirm={handleTagLanguageConfirm}
        isProcessing={isInitializingTags}
      />
    </div>
  );
}
