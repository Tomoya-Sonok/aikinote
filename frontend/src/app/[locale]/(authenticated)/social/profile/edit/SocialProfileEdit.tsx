"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/shared/Button/Button";
import { Loader } from "@/components/shared/Loader/Loader";
import {
  SocialHeader,
  SocialLayout,
} from "@/components/shared/layouts/SocialLayout";
import { useToast } from "@/contexts/ToastContext";
import { getSocialProfile, updateUserBasicInfo } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./SocialProfileEdit.module.css";

type PublicitySetting = "public" | "closed" | "private";

export function SocialProfileEdit() {
  const bioId = useId();
  const publicityId = useId();
  const { user } = useAuth();
  const locale = useLocale();
  const t = useTranslations("socialPosts");
  const { showToast } = useToast();
  const [bio, setBio] = useState("");
  const [publicitySetting, setPublicitySetting] =
    useState<PublicitySetting>("public");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const fetchProfile = async () => {
      try {
        const result = await getSocialProfile(user.id);
        if (result.success && result.data) {
          const data = result.data as {
            user: {
              bio: string | null;
              publicity_setting?: string | null;
            };
          };
          setBio(data.user.bio || "");
          if (
            data.user.publicity_setting === "public" ||
            data.user.publicity_setting === "closed" ||
            data.user.publicity_setting === "private"
          ) {
            setPublicitySetting(data.user.publicity_setting);
          }
        }
      } catch (error) {
        console.error("プロフィール取得エラー:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleBack = useCallback(() => {
    window.location.href = `/${locale}/social/profile`;
  }, [locale]);

  const handleSave = useCallback(async () => {
    if (!user?.id || isSaving) return;
    setIsSaving(true);
    try {
      await updateUserBasicInfo({
        userId: user.id,
        bio: bio.trim() || null,
        publicity_setting: publicitySetting,
      });
      showToast(t("profileUpdateSuccess"), "success");
      window.location.href = `/${locale}/social/profile`;
    } catch {
      showToast(t("profileUpdateFailed"), "error");
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, bio, publicitySetting, isSaving, locale, showToast, t]);

  if (isLoading) {
    return (
      <SocialLayout>
        <Loader centered size="medium" />
      </SocialLayout>
    );
  }

  return (
    <SocialLayout>
      <SocialHeader
        title={t("profileEdit")}
        onBack={handleBack}
        backLabel={t("back")}
        right={
          <Button
            variant="primary"
            size="small"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "..." : t("submit")}
          </Button>
        }
      />

      <div className={styles.form}>
        <div className={styles.section}>
          <label className={styles.label} htmlFor={bioId}>
            Bio
          </label>
          <textarea
            id={bioId}
            className={styles.textarea}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("bioPlaceholder")}
            rows={4}
            maxLength={500}
          />
        </div>

        <div className={styles.section}>
          <span className={styles.label} id={publicityId}>
            {t("publicitySetting")}
          </span>
          <div
            className={styles.radioGroup}
            role="radiogroup"
            aria-labelledby={publicityId}
          >
            {(["public", "closed", "private"] as const).map((option) => (
              <label key={option} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="publicitySetting"
                  value={option}
                  checked={publicitySetting === option}
                  onChange={() => setPublicitySetting(option)}
                  className={styles.radioInput}
                />
                <span>
                  {option === "public" && t("publicityPublic")}
                  {option === "closed" && t("publicityClosed")}
                  {option === "private" && t("publicityPrivate")}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.linkSection}>
          <p className={styles.linkNote}>
            プロフィール画像やユーザー名は
            <a
              href={`/${locale}/mypage/basic-info/edit`}
              className={styles.link}
            >
              基本情報の編集
            </a>
            から変更できます。
          </p>
        </div>
      </div>
    </SocialLayout>
  );
}
