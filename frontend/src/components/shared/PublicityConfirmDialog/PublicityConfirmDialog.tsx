"use client";

import { CaretDown, CaretRight, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/shared/Button/Button";
import {
  DojoStyleAutocomplete,
  type DojoStyleOption,
} from "@/components/shared/DojoStyleAutocomplete/DojoStyleAutocomplete";
import { Loader } from "@/components/shared/Loader/Loader";
import {
  getPublicityDojos,
  getUserInfo,
  updatePublicityDojos,
  updateUserInfo,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePublicityConfirmStore } from "@/stores/publicityConfirmStore";
import styles from "./PublicityConfirmDialog.module.css";

type PublicityValue = "public" | "closed" | "private";

const PUBLICITY_OPTIONS: PublicityValue[] = ["public", "closed", "private"];

interface DojoEntry {
  id: string;
  dojo_name: string;
}

interface PublicityConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PublicityConfirmDialog({
  isOpen,
  onCancel,
  onConfirm,
}: PublicityConfirmDialogProps) {
  const { user } = useAuth();
  const t = useTranslations();
  const groupId = useId();
  const titleId = useId();
  const checkboxId = useId();
  const { setHasConfirmedPublicity } = usePublicityConfirmStore();

  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // 公開範囲の状態
  const [value, setValue] = useState<PublicityValue>("public");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userDojo, setUserDojo] = useState<DojoEntry | null>(null);
  const [selectedDojos, setSelectedDojos] = useState<DojoEntry[]>([]);
  const [dojoSearchValue, setDojoSearchValue] = useState("");
  const [dojoSearchId, setDojoSearchId] = useState<string | null>(null);

  // ダイアログが開かれたときにデータを取得
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    setIsLoading(true);
    const fetchData = async () => {
      try {
        const [userResult, dojosResult] = await Promise.all([
          getUserInfo(user.id),
          getPublicityDojos(user.id),
        ]);

        if (userResult.success && userResult.data) {
          const setting = userResult.data.publicity_setting;
          if (
            setting === "public" ||
            setting === "closed" ||
            setting === "private"
          ) {
            setValue(setting);
          }
          if (
            userResult.data.dojo_style_id &&
            userResult.data.dojo_style_name
          ) {
            setUserDojo({
              id: userResult.data.dojo_style_id,
              dojo_name: userResult.data.dojo_style_name,
            });
          }
        }

        if (dojosResult.success && dojosResult.data) {
          setSelectedDojos(
            dojosResult.data.map((d) => ({
              id: d.dojo_style_id,
              dojo_name: d.dojo_name,
            })),
          );
        }
      } catch (error) {
        console.error("公開範囲設定取得エラー:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isOpen, user?.id]);

  const handleValueChange = (newValue: PublicityValue) => {
    setValue(newValue);
    if (newValue === "closed" && userDojo) {
      setSelectedDojos((prev) => {
        if (prev.some((d) => d.id === userDojo.id)) return prev;
        return [userDojo, ...prev];
      });
    }
  };

  const handleDojoSelect = (dojoStyle: DojoStyleOption) => {
    setSelectedDojos((prev) => {
      if (prev.some((d) => d.id === dojoStyle.id)) return prev;
      return [...prev, { id: dojoStyle.id, dojo_name: dojoStyle.dojo_name }];
    });
    setDojoSearchValue("");
    setDojoSearchId(null);
  };

  const handleDojoRemove = (dojoId: string) => {
    if (dojoId === userDojo?.id) return;
    setSelectedDojos((prev) => prev.filter((d) => d.id !== dojoId));
  };

  const handleConfirm = useCallback(async () => {
    if (isSaving) return;

    if (dontShowAgain) {
      setHasConfirmedPublicity(true);
    }

    // "public" 以外が選択されている場合のみ API で更新
    if (value !== "public" && user?.id) {
      setIsSaving(true);
      try {
        if (value === "closed") {
          await updatePublicityDojos(
            user.id,
            selectedDojos.map((d) => d.id),
          );
        }
        const result = await updateUserInfo({
          userId: user.id,
          publicity_setting: value,
        });
        if (!result.success) {
          throw new Error(t("publicityConfirmDialog.saveFailed"));
        }
      } catch (error) {
        console.error("公開範囲設定更新エラー:", error);
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }

    onConfirm();
  }, [
    isSaving,
    dontShowAgain,
    value,
    user?.id,
    selectedDojos,
    setHasConfirmedPublicity,
    t,
    onConfirm,
  ]);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className={styles.title}>
          {t("publicityConfirmDialog.title")}
        </h2>

        <p className={styles.description}>
          {t("publicityConfirmDialog.description")}
        </p>

        {/* アコーディオン: 公開範囲を確認する */}
        <div className={styles.accordionSection}>
          <button
            type="button"
            className={styles.accordionToggle}
            onClick={() => setIsAccordionOpen((prev) => !prev)}
            aria-expanded={isAccordionOpen}
          >
            {isAccordionOpen ? (
              <CaretDown size={14} weight="bold" color="var(--black)" />
            ) : (
              <CaretRight size={14} weight="bold" color="var(--black)" />
            )}
            <span>{t("publicityConfirmDialog.accordionLabel")}</span>
          </button>

          {isAccordionOpen && (
            <div className={styles.accordionContent}>
              {isLoading ? (
                <Loader centered size="small" />
              ) : (
                <div
                  className={styles.radioGroup}
                  role="radiogroup"
                  aria-labelledby={groupId}
                >
                  {PUBLICITY_OPTIONS.map((option) => (
                    <div key={option} className={styles.radioOption}>
                      <label className={styles.radioLabel}>
                        <input
                          type="radio"
                          name="publicity-confirm"
                          value={option}
                          checked={value === option}
                          onChange={() => handleValueChange(option)}
                          className={styles.radioInput}
                        />
                        <div className={styles.radioContent}>
                          <span className={styles.radioTitle}>
                            {t(`publicitySetting.${option}`)}
                          </span>
                          <span className={styles.radioDescription}>
                            {t(`publicitySetting.${option}Description`)}
                          </span>
                        </div>
                      </label>

                      {option === "closed" && value === "closed" && (
                        <div className={styles.closedDojoSection}>
                          {!userDojo && (
                            <p className={styles.noDojoWarning}>
                              {t("publicitySetting.noDojoWarning")}
                            </p>
                          )}

                          <div className={styles.dojoAddRow}>
                            <DojoStyleAutocomplete
                              value={dojoSearchValue}
                              onChange={setDojoSearchValue}
                              onSelect={handleDojoSelect}
                              placeholder={t(
                                "publicitySetting.addDojoPlaceholder",
                              )}
                              selectedId={dojoSearchId}
                              onClear={() => {
                                setDojoSearchValue("");
                                setDojoSearchId(null);
                              }}
                            />
                          </div>

                          {selectedDojos.length > 0 && (
                            <div className={styles.selectedDojoList}>
                              {selectedDojos.map((dojo) => (
                                <div key={dojo.id} className={styles.dojoChip}>
                                  <span className={styles.dojoChipName}>
                                    {dojo.dojo_name}
                                  </span>
                                  {dojo.id === userDojo?.id ? (
                                    <span className={styles.defaultBadge}>
                                      {t("publicitySetting.defaultDojo")}
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      className={styles.dojoChipRemove}
                                      onClick={() => handleDojoRemove(dojo.id)}
                                      aria-label={`${dojo.dojo_name} を削除`}
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 今後は表示しない */}
        <div className={styles.checkboxRow}>
          <input
            type="checkbox"
            id={checkboxId}
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className={styles.checkbox}
          />
          <label htmlFor={checkboxId} className={styles.checkboxLabel}>
            {t("publicityConfirmDialog.dontShowAgain")}
          </label>
        </div>

        {/* アクションボタン */}
        <div className={styles.actions}>
          <Button
            variant="cancel"
            className={styles.actionButton}
            onClick={onCancel}
            disabled={isSaving}
          >
            {t("publicityConfirmDialog.cancel")}
          </Button>
          <Button
            variant="primary"
            className={styles.actionButton}
            onClick={handleConfirm}
            disabled={isSaving}
          >
            {isSaving ? "..." : t("publicityConfirmDialog.confirm")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
