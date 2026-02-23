"use client";

import {
  ImagesSquareIcon,
  PencilSimpleIcon,
  TrashIcon as PhosphorTrashIcon,
  UserCircleIcon,
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
import { Loader } from "@/components/shared/Loader/Loader";
import { useToast } from "@/contexts/ToastContext";
import { getUserProfile, updateUserProfile } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { compressImage } from "@/lib/utils/compressImage";
import { usernameSchema } from "@/lib/utils/validation";
import styles from "./ProfileEdit.module.css";

interface ProfileEditProps {
  user: UserProfile;
}

export const ProfileEdit: FC<ProfileEditProps> = ({ user: initialUser }) => {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { showToast } = useToast();
  const { refreshUser } = useAuth();
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [loading, setLoading] = useState(true);
  const usernameInputId = useId();
  const dojoInputId = useId();
  const trainingStartInputId = useId();

  const handleSave = async () => {
    // バリデーションチェック
    try {
      usernameSchema.parse({ username: formData.username });
    } catch (error) {
      if (error instanceof ZodError) {
        setUsernameError(
          error.issues[0]?.message || t("profileEdit.invalidUsername"),
        );
        return;
      }
    }

    try {
      let updatedProfileImageUrl = formData.profile_image_url;

      // 画像アップロード処理
      if (profileImageFile) {
        updatedProfileImageUrl = await uploadImageToS3(profileImageFile);
      }

      const updatedData = {
        userId: user.id,
        username: formData.username,
        dojo_style_name: formData.dojo_style_name || null,
        training_start_date: formData.training_start_date || null,
        profile_image_url: updatedProfileImageUrl || null,
      };

      const result = await updateUserProfile(updatedData);
      if (!result.success) {
        throw new Error(result.error || t("profileEdit.communicationFailed"));
      }

      // ユーザー情報を再取得してセッションを更新
      await refreshUser();

      showToast(t("profileEdit.updateSuccess"), "success");

      router.push(`/${locale}/mypage`);
    } catch (error) {
      console.error("プロフィール更新エラー:", error);
      showToast(
        error instanceof Error
          ? error.message
          : t("profileEdit.communicationFailed"),
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

  const [formData, setFormData] = useState({
    username: user.username,
    dojo_style_name: user.dojo_style_name || "",
    training_start_date: user.training_start_date || "",
    profile_image_url: user.profile_image_url || "",
  });

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // 画像アップロード用のヘルパー関数
  const uploadImageToS3 = async (file: File): Promise<string> => {
    // ステップ1: 署名付きURLを取得
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
      throw new Error(errorData.error || t("profileEdit.uploadUrlFailed"));
    }

    const { uploadUrl, fileKey } = await uploadUrlResponse.json();

    // ステップ2: S3にファイルをアップロード
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(t("profileEdit.s3UploadFailed"));
    }

    // ステップ3: プロフィール画像URLを更新
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
        errorData.error || t("profileEdit.profileImageUpdateFailed"),
      );
    }

    const { imageUrl } = await updateResponse.json();
    return imageUrl;
  };

  // 最新のプロフィール情報を取得
  const fetchUserProfile = useCallback(async () => {
    try {
      const result = await getUserProfile(user.id);
      if (!result.success || !result.data) {
        const errorMessage =
          "error" in result
            ? result.error
            : t("profileEdit.profileFetchFailed");
        throw new Error(errorMessage);
      }

      const latestUser = result.data;

      // ユーザー情報とフォームデータを更新
      setUser(latestUser);
      setFormData({
        username: latestUser.username,
        dojo_style_name: latestUser.dojo_style_name || "",
        training_start_date: latestUser.training_start_date || "",
        profile_image_url: latestUser.profile_image_url || "",
      });
    } catch (error) {
      console.error("プロフィール取得エラー:", error);
      showToast(t("profileEdit.profileFetchFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, t, user.id]);

  // コンポーネントマウント時に最新プロフィールを取得
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // フォームデータの初期化（userが更新された時）
  useEffect(() => {
    setFormData({
      username: user.username,
      dojo_style_name: user.dojo_style_name || "",
      training_start_date: user.training_start_date || "",
      profile_image_url: user.profile_image_url || "",
    });
  }, [user]);

  const handleInputChange =
    (field: keyof typeof formData) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // ユーザー名のバリデーション
      if (field === "username") {
        try {
          usernameSchema.parse({ username: value });
          setUsernameError(null);
        } catch (error) {
          if (error instanceof ZodError) {
            setUsernameError(
              error.issues[0]?.message || t("profileEdit.invalidUsername"),
            );
          }
        }
      }
    };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // 画像をリサイズ・圧縮してからセット
        const compressedFile = await compressImage(file, {
          maxWidth: 512,
          maxHeight: 512,
          quality: 0.85,
          outputType: "image/jpeg",
          maxFileSize: 1024 * 1024, // 1MB
        });
        setProfileImageFile(compressedFile);
        const url = URL.createObjectURL(compressedFile);
        setPreviewUrl(url);
      } catch {
        showToast(t("profileEdit.communicationFailed"), "error");
      }
    }
  };

  const handleDeleteImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setProfileImageFile(null);
    setPreviewUrl(null);
  };

  const currentImageUrl = previewUrl || user.profile_image_url;
  const uploadInstructionLines = t("profileEdit.uploadInstructions").split(
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

  // ローディング中の表示
  if (loading) {
    return (
      <div className={styles.content}>
        <Loader size="medium" centered text={t("profileEdit.loading")} />
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
                  alt={t("profileEdit.profileImageAlt")}
                  fill
                  sizes="96px"
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              ) : (
                <UserCircleIcon
                  size={48}
                  weight="light"
                  color="var(--aikinote-black)"
                />
              )}
            </div>
            <div className={styles.editIcon}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={styles.fileInput}
              />
              <ImagesSquareIcon
                size={16}
                weight="light"
                color="var(--aikinote-black)"
              />
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
                  color: profileImageFile ? "#000" : "#6b7280",
                }}
              >
                {profileImageFile
                  ? profileImageFile.name
                  : t("profileEdit.noFileUploaded")}
              </p>
              <button
                className={styles.deleteButton}
                type="button"
                onClick={handleDeleteImage}
                disabled={!profileImageFile}
                style={{
                  opacity: profileImageFile ? 1 : 0.5,
                  cursor: profileImageFile ? "pointer" : "not-allowed",
                }}
              >
                <PhosphorTrashIcon
                  size={16}
                  weight="light"
                  color="var(--aikinote-black)"
                />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.formGroup}>
            <label htmlFor={usernameInputId} className={styles.label}>
              {t("profileEdit.username")}
              <span className={styles.required}>
                {t("profileEdit.required")}
              </span>
            </label>
            <input
              type="text"
              id={usernameInputId}
              value={formData.username}
              onChange={handleInputChange("username")}
              className={`${styles.inputField} ${usernameError ? styles.error : ""}`}
              placeholder={t("profileEdit.usernamePlaceholder")}
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
            <label htmlFor={dojoInputId} className={styles.label}>
              {t("profileEdit.currentDojo")}
            </label>
            <input
              type="text"
              id={dojoInputId}
              value={formData.dojo_style_name}
              onChange={handleInputChange("dojo_style_name")}
              placeholder={t("profileEdit.dojoPlaceholder")}
              className={styles.inputField}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor={trainingStartInputId} className={styles.label}>
              {t("profileEdit.trainingStartDate")}
            </label>
            <input
              type="text"
              id={trainingStartInputId}
              value={formData.training_start_date}
              onChange={handleInputChange("training_start_date")}
              placeholder={t("profileEdit.trainingStartPlaceholder")}
              className={styles.inputField}
            />
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={handleCancel}>
          {t("profileEdit.cancel")}
        </Button>
        <Button variant="primary" onClick={handleSave}>
          {t("profileEdit.save")}
        </Button>
      </div>
    </>
  );
};
