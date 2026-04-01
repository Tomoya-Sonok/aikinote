"use client";

import { X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/shared/Button/Button";
import {
  DojoStyleAutocomplete,
  type DojoStyleOption,
} from "@/components/shared/DojoStyleAutocomplete/DojoStyleAutocomplete";
import { Loader } from "@/components/shared/Loader/Loader";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { useToast } from "@/contexts/ToastContext";
import {
  getPublicityDojos,
  getUserInfo,
  updatePublicityDojos,
  updateUserInfo,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./PublicitySetting.module.css";

type PublicityValue = "public" | "closed" | "private";

const PUBLICITY_OPTIONS: PublicityValue[] = ["public", "closed", "private"];

interface DojoEntry {
  id: string;
  dojo_name: string;
}

interface PublicitySettingProps {
  locale: string;
}

export function PublicitySetting({ locale }: PublicitySettingProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const t = useTranslations();
  const groupId = useId();

  const [value, setValue] = useState<PublicityValue>("public");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ユーザーの所属道場
  const [userDojo, setUserDojo] = useState<DojoEntry | null>(null);

  // "closed" 時の公開対象道場リスト
  const [selectedDojos, setSelectedDojos] = useState<DojoEntry[]>([]);
  const [dojoSearchValue, setDojoSearchValue] = useState("");
  const [dojoSearchId, setDojoSearchId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
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
  }, [user?.id]);

  // "closed" に切り替え時、所属道場がまだ含まれていなければ追加
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
    // 所属道場は削除不可
    if (dojoId === userDojo?.id) return;
    setSelectedDojos((prev) => prev.filter((d) => d.id !== dojoId));
  };

  const handleSave = useCallback(async () => {
    if (!user?.id || isSaving) return;
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
        throw new Error(t("publicitySetting.saveFailed"));
      }
      showToast(t("publicitySetting.saved"), "success");
      router.push(`/${locale}/mypage`);
    } catch (error) {
      console.error("公開範囲設定更新エラー:", error);
      showToast(t("publicitySetting.saveFailed"), "error");
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, value, selectedDojos, isSaving, showToast, t, router, locale]);

  return (
    <MinimalLayout
      headerTitle={t("publicitySetting.title")}
      backHref={`/${locale}/mypage`}
    >
      {isLoading ? (
        <Loader centered size="large" />
      ) : (
        <div className={styles.container}>
          <p className={styles.description}>
            {t("publicitySetting.description")}
          </p>

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
                    name="publicity"
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
                        placeholder={t("publicitySetting.addDojoPlaceholder")}
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

          <div className={styles.actions}>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "..." : t("publicitySetting.saveButton")}
            </Button>
          </div>
        </div>
      )}
    </MinimalLayout>
  );
}
