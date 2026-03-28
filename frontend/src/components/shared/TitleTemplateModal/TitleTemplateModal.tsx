"use client";

import { CaretDown, CaretRight, Trash } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/shared/Button/Button";
import { useToast } from "@/contexts/ToastContext";
import {
  createTitleTemplate,
  deleteTitleTemplate,
  getTitleTemplates,
  type TitleTemplate,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  DATE_FORMAT_OPTIONS,
  type DateFormatPattern,
  formatDateByPattern,
  resolveTemplate,
} from "@/lib/utils/dateUtils";
import styles from "./TitleTemplateModal.module.css";

const MAX_TEMPLATES = 5;

interface TitleTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (title: string) => void;
  dateOverride?: string;
}

export function TitleTemplateModal({
  isOpen,
  onClose,
  onInsert,
  dateOverride,
}: TitleTemplateModalProps) {
  const { user } = useAuth();
  const t = useTranslations("titleTemplate");
  const { showToast } = useToast();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // テンプレート一覧
  const [templates, setTemplates] = useState<TitleTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string>("default");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDateFormat, setNewDateFormat] = useState<DateFormatPattern | null>(
    "yyyy-MM-dd",
  );
  const [newTemplateName, setNewTemplateName] = useState("");
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const defaultTemplateText = useMemo(
    () => resolveTemplate("稽古記録", "yyyy-MM-dd", dateOverride),
    [dateOverride],
  );

  const fetchTemplates = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getTitleTemplates(user.id);
      setTemplates(data);
    } catch {
      // エラーは静かに無視
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchTemplates();
      setSelectedId("default");
      setIsAddOpen(false);
      setNewDateFormat("yyyy-MM-dd");
      setNewTemplateName("");
      setAddError("");
    }
  }, [isOpen, user?.id, fetchTemplates]);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      onClose();
    }
  };

  const handleInsert = () => {
    if (selectedId === "default") {
      onInsert(defaultTemplateText);
    } else {
      const template = templates.find((t) => t.id === selectedId);
      if (template) {
        const resolved = resolveTemplate(
          template.template_text,
          template.date_format,
          dateOverride,
        );
        onInsert(resolved);
      }
    }
    onClose();
  };

  const handleAdd = async () => {
    if (!user?.id) return;

    const trimmed = newTemplateName.trim();
    if (!trimmed) {
      setAddError(t("templateRequired"));
      return;
    }
    if (trimmed.length > 35) {
      setAddError(t("templateTooLong"));
      return;
    }
    if (templates.length >= MAX_TEMPLATES) {
      setAddError(t("maxTemplatesReached"));
      return;
    }

    setIsAdding(true);
    setAddError("");
    try {
      const created = await createTitleTemplate({
        user_id: user.id,
        template_text: trimmed,
        date_format: newDateFormat,
      });
      if (created) {
        setTemplates((prev) => [...prev, created]);
        setNewTemplateName("");
        setNewDateFormat("yyyy-MM-dd");
        setIsAddOpen(false);
      }
    } catch {
      showToast(t("addFailed"), "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!user?.id) return;
    try {
      await deleteTitleTemplate(templateId, user.id);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      if (selectedId === templateId) {
        setSelectedId("default");
      }
    } catch {
      showToast(t("deleteFailed"), "error");
    }
  };

  const addPreview = useMemo(() => {
    const name = newTemplateName.trim() || "...";
    return resolveTemplate(name, newDateFormat, dateOverride);
  }, [newTemplateName, newDateFormat, dateOverride]);

  const getDateFormatLabel = (fmt: DateFormatPattern | null): string => {
    if (!fmt) return t("dateFormatNone");
    return formatDateByPattern(fmt, dateOverride);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} role="presentation">
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <h2 className={styles.title} id={titleId}>
          {t("modalTitle")}
        </h2>

        {/* テンプレート一覧 */}
        <div className={styles.templateList}>
          {loading ? (
            <div className={styles.loading}>...</div>
          ) : (
            <>
              {/* デフォルトテンプレート */}
              <label className={styles.templateItem}>
                <input
                  type="radio"
                  name="titleTemplate"
                  value="default"
                  checked={selectedId === "default"}
                  onChange={() => setSelectedId("default")}
                  className={styles.radio}
                />
                <span className={styles.templateText}>
                  {defaultTemplateText}
                </span>
                <span className={styles.defaultBadge}>{t("defaultLabel")}</span>
              </label>

              {/* ユーザー追加テンプレート */}
              {templates.map((tmpl) => (
                <label key={tmpl.id} className={styles.templateItem}>
                  <input
                    type="radio"
                    name="titleTemplate"
                    value={tmpl.id}
                    checked={selectedId === tmpl.id}
                    onChange={() => setSelectedId(tmpl.id)}
                    className={styles.radio}
                  />
                  <span className={styles.templateText}>
                    {resolveTemplate(
                      tmpl.template_text,
                      tmpl.date_format,
                      dateOverride,
                    )}
                  </span>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(tmpl.id);
                    }}
                    aria-label={`${tmpl.template_text} を削除`}
                  >
                    <Trash size={16} weight="light" color="var(--text-light)" />
                  </button>
                </label>
              ))}
            </>
          )}
        </div>

        {/* 折りたたみ: 新しいテンプレートを追加 */}
        <div className={styles.addSection}>
          <button
            type="button"
            className={styles.addToggle}
            onClick={() => setIsAddOpen((prev) => !prev)}
            aria-expanded={isAddOpen}
          >
            {isAddOpen ? (
              <CaretDown size={14} weight="bold" color="var(--black)" />
            ) : (
              <CaretRight size={14} weight="bold" color="var(--black)" />
            )}
            <span>{t("addNew")}</span>
          </button>

          {isAddOpen && (
            <div className={styles.addForm}>
              {/* 日付の形式 */}
              <label className={styles.formField}>
                <span className={styles.formLabel}>{t("dateFormat")}</span>
                <select
                  className={styles.select}
                  value={newDateFormat ?? ""}
                  onChange={(e) =>
                    setNewDateFormat(
                      (e.target.value || null) as DateFormatPattern | null,
                    )
                  }
                >
                  {DATE_FORMAT_OPTIONS.map((fmt) => (
                    <option key={fmt ?? "none"} value={fmt ?? ""}>
                      {getDateFormatLabel(fmt)}
                    </option>
                  ))}
                </select>
              </label>

              {/* テンプレート名 */}
              <label className={styles.formField}>
                <span className={styles.formLabel}>{t("templateName")}</span>
                <input
                  type="text"
                  className={styles.textInput}
                  value={newTemplateName}
                  onChange={(e) => {
                    setNewTemplateName(e.target.value);
                    setAddError("");
                  }}
                  placeholder={t("templateNamePlaceholder")}
                  maxLength={35}
                />
              </label>

              {/* プレビュー */}
              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>{t("preview")}:</span>
                <span className={styles.previewValue}>{addPreview}</span>
              </div>

              {addError && <span className={styles.errorText}>{addError}</span>}

              <div className={styles.addButtonRow}>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={handleAdd}
                  disabled={isAdding || !newTemplateName.trim()}
                >
                  {isAdding ? "..." : t("add")}
                </Button>
              </div>

              {/* 注釈 */}
              {newDateFormat && (
                <p className={styles.hint}>{t("dateAutoReplaceHint")}</p>
              )}
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className={styles.actions}>
          <Button
            variant="cancel"
            size="medium"
            onClick={onClose}
            className={styles.actionButton}
          >
            {t("close")}
          </Button>
          <Button
            variant="primary"
            size="medium"
            onClick={handleInsert}
            className={styles.actionButton}
          >
            {t("insert")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
