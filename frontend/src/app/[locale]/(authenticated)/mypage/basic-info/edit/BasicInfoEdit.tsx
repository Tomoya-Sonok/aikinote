"use client";

import {
  ImagesSquareIcon,
  TrashIcon as PhosphorTrashIcon,
  UserIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  type ChangeEvent,
  type FC,
  Fragment,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { ZodError } from "zod";
import type { UserProfile } from "@/components/features/personal/MyPageContent/MyPageContent";
import { Button } from "@/components/shared/Button/Button";
import {
  DojoStyleAutocomplete,
  type DojoStyleOption,
} from "@/components/shared/DojoStyleAutocomplete/DojoStyleAutocomplete";
import { Loader } from "@/components/shared/Loader/Loader";
import { useToast } from "@/contexts/ToastContext";
import {
  checkUsernameAvailability,
  createDojoStyle,
  getUserBasicInfo,
  updateUserBasicInfo,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { compressImage } from "@/lib/utils/compressImage";
import { usernameSchema } from "@/lib/utils/validation";
import styles from "./BasicInfoEdit.module.css";

interface BasicInfoEditProps {
  user: UserProfile;
}

export const BasicInfoEdit: FC<BasicInfoEditProps> = ({
  user: initialUser,
}) => {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { showToast } = useToast();
  const { refreshUser } = useAuth();
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [loading, setLoading] = useState(true);
  const usernameInputId = useId();
  const trainingStartInputId = useId();

  const [formData, setFormData] = useState({
    username: user.username,
    dojo_name: user.dojo_style_name || "",
    dojo_style_id: user.dojo_style_id || (null as string | null),
    training_start_date: user.training_start_date || "",
    profile_image_url: user.profile_image_url || "",
  });

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [dojoStyleError, setDojoStyleError] = useState<string | null>(null);

  const handleSave = async () => {
    // バリデーションチェック
    try {
      usernameSchema.parse({ username: formData.username });
    } catch (error) {
      if (error instanceof ZodError) {
        setUsernameError(
          error.issues[0]?.message || t("basicInfoEdit.invalidUsername"),
        );
        return;
      }
    }

    // 重複チェック中または重複エラーがある場合は保存しない
    if (checkingUsername || usernameError) {
      return;
    }

    // 道場名: テキスト入力があるのに未登録の場合はエラー
    if (formData.dojo_name && !formData.dojo_style_id) {
      setDojoStyleError(t("basicInfoEdit.dojoStyleNotRegistered"));
      return;
    }
    setDojoStyleError(null);

    try {
      let updatedProfileImageUrl = formData.profile_image_url;

      // 画像アップロード処理
      if (profileImageFile) {
        updatedProfileImageUrl = await uploadImageToS3(profileImageFile);
      }

      const updatedData = {
        userId: user.id,
        username: formData.username,
        dojo_style_name: formData.dojo_name || null,
        dojo_style_id: formData.dojo_style_id,
        training_start_date: formData.training_start_date || null,
        profile_image_url: updatedProfileImageUrl || null,
      };

      const result = await updateUserBasicInfo(updatedData);
      if (!result.success) {
        const errorMsg = result.error || "";
        if (errorMsg.includes("既に使用されています")) {
          setUsernameError(t("basicInfoEdit.usernameTaken"));
          return;
        }
        throw new Error(errorMsg || t("basicInfoEdit.communicationFailed"));
      }

      // ユーザー情報を再取得してセッションを更新
      await refreshUser();

      showToast(t("basicInfoEdit.updateSuccess"), "success");

      router.push(`/${locale}/mypage`);
    } catch (error) {
      console.error("基本情報更新エラー:", error);
      showToast(
        error instanceof Error
          ? error.message
          : t("basicInfoEdit.communicationFailed"),
        "error",
      );
    }
  };

  const handleCancel = () => {
    // プレビューURLをクリーンアップ
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    router.push(`/${locale}/mypage`);
  };

  // 画像アップロード用のヘルパー関数
  const uploadImageToS3 = async (file: File): Promise<string> => {
    const uploadUrlResponse = await fetch("/api/upload-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      }),
    });

    if (!uploadUrlResponse.ok) {
      const errorData = await uploadUrlResponse.json();
      throw new Error(errorData.error || t("basicInfoEdit.uploadUrlFailed"));
    }

    const { uploadUrl, fileKey } = await uploadUrlResponse.json();

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(t("basicInfoEdit.s3UploadFailed"));
    }

    const updateResponse = await fetch("/api/profile-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileKey,
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(
        errorData.error || t("basicInfoEdit.profileImageUpdateFailed"),
      );
    }

    const { imageUrl } = await updateResponse.json();
    return imageUrl;
  };

  // 最新の基本情報を取得
  const fetchUserBasicInfo = useCallback(async () => {
    try {
      const result = await getUserBasicInfo(user.id);
      if (!result.success || !result.data) {
        const errorMessage =
          "error" in result
            ? result.error
            : t("basicInfoEdit.profileFetchFailed");
        throw new Error(errorMessage);
      }

      const latestUser = result.data;

      setUser(latestUser);
      setFormData((prev) => ({
        ...prev,
        username: latestUser.username,
        dojo_name: latestUser.dojo_style_name || "",
        dojo_style_id: latestUser.dojo_style_id || null,
        training_start_date: latestUser.training_start_date || "",
        profile_image_url: latestUser.profile_image_url || "",
      }));
    } catch (error) {
      console.error("基本情報取得エラー:", error);
      showToast(t("basicInfoEdit.profileFetchFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, t, user.id]);

  useEffect(() => {
    fetchUserBasicInfo();
  }, [fetchUserBasicInfo]);

  const handleInputChange =
    (field: "username" | "training_start_date" | "profile_image_url") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      if (field === "username") {
        try {
          usernameSchema.parse({ username: value });
          setUsernameError(null);
        } catch (error) {
          if (error instanceof ZodError) {
            setUsernameError(
              error.issues[0]?.message || t("basicInfoEdit.invalidUsername"),
            );
          }
        }
      }
    };

  const handleUsernameBlur = useCallback(async () => {
    const username = formData.username;

    // フォーマットエラーがある場合はスキップ
    if (usernameError) return;

    // 変更がない場合はスキップ
    if (username === user.username) return;

    // Zodバリデーションを再チェック
    try {
      usernameSchema.parse({ username });
    } catch {
      return;
    }

    setCheckingUsername(true);
    try {
      const available = await checkUsernameAvailability(username, user.id);
      if (!available) {
        setUsernameError(t("basicInfoEdit.usernameTaken"));
      }
    } finally {
      setCheckingUsername(false);
    }
  }, [formData.username, user.username, user.id, usernameError, t]);

  const handleDojoStyleSelect = (dojoStyle: DojoStyleOption) => {
    setFormData((prev) => ({
      ...prev,
      dojo_name: dojoStyle.dojo_name,
      dojo_style_id: dojoStyle.id,
    }));
    setDojoStyleError(null);
  };

  const handleRegisterNewDojo = async (query: string) => {
    try {
      const result = await createDojoStyle({
        dojo_name: query,
      });

      if (result.success && result.data) {
        setFormData((prev) => ({
          ...prev,
          dojo_name: result.data.dojo_name,
          dojo_style_id: result.data.id,
        }));
        setDojoStyleError(null);
        showToast(t("basicInfoEdit.dojoRegistrationSuccess"), "success");
      }
    } catch (error) {
      console.error("道場登録エラー:", error);
      showToast(t("basicInfoEdit.communicationFailed"), "error");
    }
  };

  const handleClearDojoStyle = () => {
    setFormData((prev) => ({
      ...prev,
      dojo_name: "",
      dojo_style_id: null,
    }));
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const compressedFile = await compressImage(file, {
          maxWidth: 512,
          maxHeight: 512,
          quality: 0.85,
          outputType: "image/jpeg",
          maxFileSize: 1024 * 1024,
        });
        setProfileImageFile(compressedFile);
        const url = URL.createObjectURL(compressedFile);
        setPreviewUrl(url);
      } catch {
        showToast(t("basicInfoEdit.communicationFailed"), "error");
      }
    }
  };

  const handleDeleteImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setProfileImageFile(null);
    setPreviewUrl(null);
    setFormData((prev) => ({ ...prev, profile_image_url: "" }));
  };

  const currentImageUrl = previewUrl || formData.profile_image_url;
  const canDeleteImage = !!profileImageFile || !!formData.profile_image_url;
  const uploadInstructionLines = t("basicInfoEdit.uploadInstructions").split(
    "\n",
  );
  const lineOccurrences = new Map<string, number>();
  const uploadInstructionItems = uploadInstructionLines.map((line) => {
    const occurrence = lineOccurrences.get(line) ?? 0;
    lineOccurrences.set(line, occurrence + 1);
    return {
      line,
      key: occurrence > 0 ? `${line}-${occurrence}` : line,
    };
  });

  if (loading) {
    return (
      <div className={styles.content}>
        <Loader size="medium" centered text={t("basicInfoEdit.loading")} />
      </div>
    );
  }

  return (
    <>
      <div className={styles.content}>
        <div className={styles.imageSection}>
          <label className={styles.profileImageContainer}>
            <div className={styles.profileImage}>
              {currentImageUrl ? (
                <Image
                  src={currentImageUrl}
                  alt={t("basicInfoEdit.profileImageAlt")}
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
                onChange={handleImageChange}
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
                  : t("basicInfoEdit.noFileUploaded")}
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

        <div className={styles.formSection}>
          <div className={styles.formGroup}>
            <label htmlFor={usernameInputId} className={styles.label}>
              {t("basicInfoEdit.username")}
              <span className={styles.required}>
                {t("basicInfoEdit.required")}
              </span>
            </label>
            <input
              type="text"
              id={usernameInputId}
              value={formData.username}
              onChange={handleInputChange("username")}
              onBlur={handleUsernameBlur}
              className={`${styles.inputField} ${usernameError ? styles.error : ""}`}
              placeholder={t("basicInfoEdit.usernamePlaceholder")}
              maxLength={20}
            />
            {usernameError && (
              <div
                style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}
              >
                {usernameError}
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <span className={styles.label}>{t("basicInfoEdit.dojoName")}</span>
            <DojoStyleAutocomplete
              value={formData.dojo_name}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, dojo_name: val }))
              }
              onSelect={handleDojoStyleSelect}
              onRegisterNew={handleRegisterNewDojo}
              placeholder={t("basicInfoEdit.dojoNamePlaceholder")}
              selectedId={formData.dojo_style_id}
              onClear={handleClearDojoStyle}
            />
            {dojoStyleError && (
              <div
                style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}
              >
                {dojoStyleError}
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor={trainingStartInputId} className={styles.label}>
              {t("basicInfoEdit.trainingStartDate")}
            </label>
            <input
              type="text"
              id={trainingStartInputId}
              value={formData.training_start_date}
              onChange={handleInputChange("training_start_date")}
              placeholder={t("basicInfoEdit.trainingStartPlaceholder")}
              className={styles.inputField}
            />
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="cancel" onClick={handleCancel}>
          {t("basicInfoEdit.cancel")}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!!usernameError || checkingUsername}
        >
          {t("basicInfoEdit.save")}
        </Button>
      </div>
    </>
  );
};
