"use client";

import {
  ImagesSquareIcon,
  TrashIcon as PhosphorTrashIcon,
  UserIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  type ChangeEvent,
  Fragment,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { ZodError } from "zod";
import { Button } from "@/components/shared/Button/Button";
import {
  DojoStyleAutocomplete,
  type DojoStyleOption,
} from "@/components/shared/DojoStyleAutocomplete/DojoStyleAutocomplete";
import { Loader } from "@/components/shared/Loader/Loader";
import {
  SocialHeader,
  SocialLayout,
} from "@/components/shared/layouts/SocialLayout";
import { useToast } from "@/contexts/ToastContext";
import {
  checkUsernameAvailability,
  createDojoStyle,
  getSocialProfile,
  updateUserInfo,
} from "@/lib/api/client";
import { AIKIDO_RANK_OPTIONS } from "@/lib/constants/aikidoRank";
import { useAuth } from "@/lib/hooks/useAuth";
import { useProfileImageUpload } from "@/lib/hooks/useProfileImageUpload";
import { usernameSchema } from "@/lib/utils/validation";
import styles from "./SocialProfileEdit.module.css";

type PublicitySetting = "public" | "closed" | "private";

export function SocialProfileEdit() {
  const bioId = useId();
  const publicityId = useId();
  const usernameInputId = useId();
  const aikidoRankInputId = useId();
  const { user } = useAuth();
  const locale = useLocale();
  const t = useTranslations("socialPosts");
  const tBasic = useTranslations("userInfoEdit");
  const { showToast } = useToast();
  const { refreshUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // フォームデータ
  const [username, setUsername] = useState("");
  const [dojoName, setDojoName] = useState("");
  const [dojoStyleId, setDojoStyleId] = useState<string | null>(null);
  const [aikidoRank, setAikidoRank] = useState("");
  const [bio, setBio] = useState("");
  const [publicitySetting, setPublicitySetting] =
    useState<PublicitySetting>("public");
  const [existingProfileImageUrl, setExistingProfileImageUrl] = useState("");

  // バリデーション
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [dojoStyleError, setDojoStyleError] = useState<string | null>(null);
  const [originalUsername, setOriginalUsername] = useState("");

  const {
    profileImageFile,
    previewUrl,
    handleImageChange,
    handleDeleteImage: handleDeleteImageHook,
    uploadImageToS3,
    cleanup: cleanupImagePreview,
  } = useProfileImageUpload();

  useEffect(() => {
    if (!user?.id) return;
    const fetchProfile = async () => {
      try {
        const result = await getSocialProfile(user.id);
        if (result.success && result.data) {
          const data = result.data as {
            user: {
              username: string;
              profile_image_url: string | null;
              bio: string | null;
              aikido_rank: string | null;
              dojo_style_name: string | null;
              publicity_setting?: string | null;
            };
          };
          setUsername(data.user.username || "");
          setOriginalUsername(data.user.username || "");
          setDojoName(data.user.dojo_style_name || "");
          setAikidoRank(data.user.aikido_rank || "");
          setBio(data.user.bio || "");
          setExistingProfileImageUrl(data.user.profile_image_url || "");
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
    cleanupImagePreview();
    window.location.href = `/${locale}/social/profile/${user?.id}`;
  }, [locale, user?.id, cleanupImagePreview]);

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    try {
      usernameSchema.parse({ username: value });
      setUsernameError(null);
    } catch (error) {
      if (error instanceof ZodError) {
        setUsernameError(error.issues[0]?.message || tBasic("invalidUsername"));
      }
    }
  };

  const handleUsernameBlur = useCallback(async () => {
    if (usernameError) return;
    if (username === originalUsername) return;

    try {
      usernameSchema.parse({ username });
    } catch {
      return;
    }

    setCheckingUsername(true);
    try {
      const available = await checkUsernameAvailability(username, user?.id);
      if (!available) {
        setUsernameError(tBasic("usernameTaken"));
      }
    } finally {
      setCheckingUsername(false);
    }
  }, [username, originalUsername, user?.id, usernameError, tBasic]);

  const handleDojoStyleSelect = (dojoStyle: DojoStyleOption) => {
    setDojoName(dojoStyle.dojo_name);
    setDojoStyleId(dojoStyle.id);
    setDojoStyleError(null);
  };

  const handleRegisterNewDojo = async (query: string) => {
    try {
      const result = await createDojoStyle({ dojo_name: query });
      if (result.success && result.data) {
        setDojoName(result.data.dojo_name);
        setDojoStyleId(result.data.id);
        setDojoStyleError(null);
        showToast(tBasic("dojoRegistrationSuccess"), "success");
      }
    } catch (error) {
      console.error("道場登録エラー:", error);
      showToast(tBasic("communicationFailed"), "error");
    }
  };

  const handleClearDojoStyle = () => {
    setDojoName("");
    setDojoStyleId(null);
  };

  const onImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    await handleImageChange(event, () => {
      showToast(tBasic("communicationFailed"), "error");
    });
  };

  const handleDeleteImage = () => {
    handleDeleteImageHook();
    setExistingProfileImageUrl("");
  };

  const handleSave = useCallback(async () => {
    if (!user?.id || isSaving) return;

    // バリデーション
    try {
      usernameSchema.parse({ username });
    } catch (error) {
      if (error instanceof ZodError) {
        setUsernameError(error.issues[0]?.message || tBasic("invalidUsername"));
        return;
      }
    }

    if (checkingUsername || usernameError) return;

    if (dojoName && !dojoStyleId) {
      setDojoStyleError(tBasic("dojoStyleNotRegistered"));
      return;
    }
    setDojoStyleError(null);

    setIsSaving(true);
    try {
      let updatedProfileImageUrl = existingProfileImageUrl;
      if (profileImageFile) {
        updatedProfileImageUrl = await uploadImageToS3(profileImageFile, {
          uploadUrl: tBasic("uploadUrlFailed"),
          s3Upload: tBasic("s3UploadFailed"),
          profileUpdate: tBasic("profileImageUpdateFailed"),
        });
      }

      const result = await updateUserInfo({
        userId: user.id,
        username,
        dojo_style_name: dojoName || null,
        dojo_style_id: dojoStyleId,
        aikido_rank: aikidoRank || null,
        bio: bio.trim() || null,
        publicity_setting: publicitySetting,
        profile_image_url: updatedProfileImageUrl || null,
      });

      if (!result.success) {
        const errorMsg = result.error || "";
        if (errorMsg.includes("既に使用されています")) {
          setUsernameError(tBasic("usernameTaken"));
          return;
        }
        throw new Error(errorMsg || tBasic("communicationFailed"));
      }

      await refreshUser();
      showToast(t("profileUpdateSuccess"), "success");
      window.location.href = `/${locale}/social/profile/${user.id}`;
    } catch (error) {
      console.error("プロフィール更新エラー:", error);
      showToast(
        error instanceof Error ? error.message : t("profileUpdateFailed"),
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    user?.id,
    isSaving,
    username,
    dojoName,
    dojoStyleId,
    aikidoRank,
    bio,
    publicitySetting,
    existingProfileImageUrl,
    profileImageFile,
    checkingUsername,
    usernameError,
    uploadImageToS3,
    refreshUser,
    showToast,
    t,
    tBasic,
    locale,
  ]);

  const currentImageUrl = previewUrl || existingProfileImageUrl;
  const canDeleteImage = !!profileImageFile || !!existingProfileImageUrl;
  const uploadInstructionLines = tBasic("uploadInstructions").split("\n");
  const lineOccurrences = new Map<string, number>();
  const uploadInstructionItems = uploadInstructionLines.map((line) => {
    const occurrence = lineOccurrences.get(line) ?? 0;
    lineOccurrences.set(line, occurrence + 1);
    return {
      line,
      key: occurrence > 0 ? `${line}-${occurrence}` : line,
    };
  });

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
            disabled={isSaving || !!usernameError || checkingUsername}
          >
            {isSaving ? "..." : tBasic("save")}
          </Button>
        }
      />

      <div className={styles.form}>
        {/* プロフィール画像 */}
        <div className={styles.imageSection}>
          <label className={styles.profileImageContainer}>
            <div className={styles.profileImage}>
              {currentImageUrl ? (
                <Image
                  src={currentImageUrl}
                  alt={tBasic("profileImageAlt")}
                  fill
                  sizes="96px"
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              ) : (
                <UserIcon size={48} weight="light" color="var(--black)" />
              )}
            </div>
            <div className={styles.editIcon}>
              <input
                type="file"
                accept="image/*"
                onChange={onImageChange}
                className={styles.fileInput}
              />
              <ImagesSquareIcon size={16} weight="light" color="var(--black)" />
            </div>
          </label>
          <div className={styles.imageUpload}>
            <p className={styles.uploadText}>
              {uploadInstructionItems.map(({ line, key }, index) => (
                <Fragment key={key}>
                  {index > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </p>
            <div className={styles.fileInfoContainer}>
              <p
                className={styles.fileInfo}
                style={{
                  color: profileImageFile
                    ? "var(--black)"
                    : "var(--text-light)",
                }}
              >
                {profileImageFile
                  ? profileImageFile.name
                  : tBasic("noFileUploaded")}
              </p>
              <button
                className={styles.deleteButton}
                type="button"
                onClick={handleDeleteImage}
                disabled={!canDeleteImage}
                style={{
                  opacity: canDeleteImage ? 1 : 0.5,
                  cursor: canDeleteImage ? "pointer" : "not-allowed",
                }}
              >
                <PhosphorTrashIcon
                  size={24}
                  weight="light"
                  color="var(--black)"
                />
              </button>
            </div>
          </div>
        </div>

        {/* ユーザー名 */}
        <div className={styles.section}>
          <label htmlFor={usernameInputId} className={styles.label}>
            {tBasic("username")}
            <span className={styles.required}>{tBasic("required")}</span>
          </label>
          <input
            type="text"
            id={usernameInputId}
            value={username}
            onChange={handleUsernameChange}
            onBlur={handleUsernameBlur}
            className={`${styles.inputField} ${usernameError ? styles.error : ""}`}
            placeholder={tBasic("usernamePlaceholder")}
            maxLength={20}
          />
          {usernameError && (
            <div className={styles.errorText}>{usernameError}</div>
          )}
        </div>

        {/* 道場名 */}
        <div className={styles.section}>
          <span className={styles.label}>{tBasic("dojoName")}</span>
          <DojoStyleAutocomplete
            value={dojoName}
            onChange={(val) => setDojoName(val)}
            onSelect={handleDojoStyleSelect}
            onRegisterNew={handleRegisterNewDojo}
            placeholder={tBasic("dojoNamePlaceholder")}
            selectedId={dojoStyleId}
            onClear={handleClearDojoStyle}
          />
          {dojoStyleError && (
            <div className={styles.errorText}>{dojoStyleError}</div>
          )}
        </div>

        {/* 段級位 */}
        <div className={styles.section}>
          <label htmlFor={aikidoRankInputId} className={styles.label}>
            {tBasic("aikidoRank")}
          </label>
          <select
            id={aikidoRankInputId}
            value={aikidoRank}
            onChange={(e) => setAikidoRank(e.target.value)}
            className={styles.selectField}
          >
            <option value="">{tBasic("aikidoRankPlaceholder")}</option>
            {AIKIDO_RANK_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* 自己紹介 */}
        <div className={styles.section}>
          <label className={styles.label} htmlFor={bioId}>
            {t("bioLabel")}
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

        {/* 公開設定 */}
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
      </div>
    </SocialLayout>
  );
}
