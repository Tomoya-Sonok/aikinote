"use client";

import type { FC } from "react";
import { useState } from "react";
import { ZodError } from "zod";
import { Button } from "@/components/atoms/Button/Button";
import { ProfileImage } from "@/components/atoms/ProfileImage/ProfileImage";
import { TextInput } from "@/components/atoms/TextInput/TextInput";
import type { UserProfile } from "@/components/organisms/MyPageContent/MyPageContent";
import { usernameSchema } from "@/lib/utils/validation";
import styles from "./ProfileEdit.module.css";

interface ProfileEditProps {
  user: UserProfile;
  onSave: (updatedUser: Partial<UserProfile>) => void;
  onCancel: () => void;
  className?: string;
}

export const ProfileEdit: FC<ProfileEditProps> = ({
  user,
  onSave,
  onCancel,
  className = "",
}) => {
  const [formData, setFormData] = useState({
    username: user.username,
    dojo_id: user.dojo_id || "",
    training_start_date: user.training_start_date || "",
  });

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const handleInputChange =
    (field: keyof typeof formData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
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
              error.errors[0]?.message || "無効なユーザー名です",
            );
          }
        }
      }
    };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSave = () => {
    // バリデーションチェック
    try {
      usernameSchema.parse({ username: formData.username });
    } catch (error) {
      if (error instanceof ZodError) {
        setUsernameError(error.errors[0]?.message || "無効なユーザー名です");
        return;
      }
    }

    const updatedData: Partial<UserProfile> = {
      username: formData.username,
      dojo_id: formData.dojo_id || null,
      training_start_date: formData.training_start_date || null,
    };

    // TODO: 画像アップロード処理を実装
    if (profileImageFile) {
      console.log("画像ファイル:", profileImageFile);
    }

    onSave(updatedData);
  };

  const handleCancel = () => {
    // プレビューURLをクリーンアップ
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onCancel();
  };

  const currentImageUrl = previewUrl || user.profile_image_url;

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleCancel}
          aria-label="戻る"
        >
          ←
        </button>
        <h1 className={styles.title}>プロフィール編集</h1>
        <button
          type="button"
          className={styles.moreButton}
          aria-label="その他のオプション"
        >
          ⋯
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.imageSection}>
          <ProfileImage
            src={currentImageUrl}
            size="large"
            alt="プロフィール画像プレビュー"
            className={styles.profileImage}
          />
          <div className={styles.imageUpload}>
            <p className={styles.uploadText}>
              画像をアップロードするには
              <br />
              左のアイコンを押下してください。
            </p>
            <p className={styles.fileInfo}>
              ファイルがアップロードされていません
            </p>
            <label className={styles.deleteButton}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={styles.fileInput}
              />
              🗑️
            </label>
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.formGroup}>
            <TextInput
              label="ユーザー名"
              value={formData.username}
              onChange={handleInputChange("username")}
              required
              error={usernameError || undefined}
              className={styles.input}
            />
            <span className={styles.requiredIndicator}>必須</span>
          </div>

          <div className={styles.formGroup}>
            <TextInput
              label="現在所属している道場（流派）は？"
              value={formData.dojo_id}
              onChange={handleInputChange("dojo_id")}
              placeholder="未入力"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <TextInput
              label="合気道を始めたのはいつ？"
              value={formData.training_start_date}
              onChange={handleInputChange("training_start_date")}
              placeholder="未入力"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={handleCancel}
            className={styles.cancelButton}
          >
            キャンセル
          </Button>
          <Button onClick={handleSave} className={styles.saveButton}>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
};
