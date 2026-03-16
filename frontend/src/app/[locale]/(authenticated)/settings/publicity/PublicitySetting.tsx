"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/shared/Button/Button";
import { Loader } from "@/components/shared/Loader/Loader";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { useToast } from "@/contexts/ToastContext";
import { getUserInfo, updateUserInfo } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./PublicitySetting.module.css";

type PublicityValue = "public" | "closed" | "private";

const PUBLICITY_OPTIONS: PublicityValue[] = ["public", "closed", "private"];

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

  useEffect(() => {
    if (!user?.id) return;
    const fetchSetting = async () => {
      try {
        const result = await getUserInfo(user.id);
        if (result.success && result.data) {
          const setting = result.data.publicity_setting;
          if (
            setting === "public" ||
            setting === "closed" ||
            setting === "private"
          ) {
            setValue(setting);
          }
        }
      } catch (error) {
        console.error("公開設定取得エラー:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSetting();
  }, [user?.id]);

  const handleSave = useCallback(async () => {
    if (!user?.id || isSaving) return;
    setIsSaving(true);
    try {
      const result = await updateUserInfo({
        userId: user.id,
        publicity_setting: value,
      });
      if (!result.success) {
        throw new Error(result.error || t("publicitySetting.saveFailed"));
      }
      showToast(t("publicitySetting.saved"), "success");
      setTimeout(() => {
        router.push(`/${locale}/mypage`);
      }, 800);
    } catch (error) {
      console.error("公開設定更新エラー:", error);
      showToast(
        error instanceof Error
          ? error.message
          : t("publicitySetting.saveFailed"),
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, value, isSaving, showToast, t, router, locale]);

  return (
    <MinimalLayout
      headerTitle={t("publicitySetting.title")}
      backHref={`/${locale}/mypage`}
    >
      {isLoading ? (
        <Loader centered size="medium" />
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
              <label key={option} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="publicity"
                  value={option}
                  checked={value === option}
                  onChange={() => setValue(option)}
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
