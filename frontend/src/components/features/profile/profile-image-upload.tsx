"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/shared/Button/Button";
import { compressImage } from "@/lib/utils/compressImage";
import styles from "./profile-image-upload.module.css";

interface ProfileImageUploadProps {
  currentImageUrl?: string;
  onUploadSuccess: (imageUrl: string) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
}

interface UploadResponse {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

export function ProfileImageUpload({
  currentImageUrl,
  onUploadSuccess,
  onUploadError,
  disabled = false,
}: ProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validateFile = (file: File): string | null => {
    // ファイル形式のチェック
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return "有効な画像ファイルを選択してください（JPG、PNG、またはWebP）";
    }

    // ファイルサイズのチェック（5MB制限）
    if (file.size > 5 * 1024 * 1024) {
      return "ファイルサイズは5MB未満である必要があります";
    }

    return null;
  };

  const getUploadUrl = async (file: File): Promise<UploadResponse> => {
    const response = await fetch("/api/upload-url", {
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

    if (!response.ok) {
      const errorData = await response.json();
      console.error("アップロードURL取得エラー:", errorData);
      throw new Error(errorData.error || "アップロードURLの取得に失敗しました");
    }

    return response.json();
  };

  const uploadToS3 = async (file: File, uploadUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // アップロード進捗の追跡
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(
            new Error(`アップロードが失敗しました。ステータス: ${xhr.status}`),
          );
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("アップロードに失敗しました"));
      });

      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  };

  const updateProfileImage = async (
    fileKey: string,
  ): Promise<{ imageUrl: string }> => {
    const response = await fetch("/api/profile-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || "プロフィール画像の更新に失敗しました",
      );
    }

    return response.json();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      onUploadError(validationError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // ステップ1: 画像をリサイズ・圧縮
      const compressedFile = await compressImage(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.85,
        outputType: "image/jpeg",
        maxFileSize: 1024 * 1024, // 1MB
      });

      // ステップ2: 署名付きアップロードURLを取得
      const { uploadUrl, fileKey } = await getUploadUrl(compressedFile);

      // ステップ3: S3にファイルをアップロード
      await uploadToS3(compressedFile, uploadUrl);

      // ステップ4: データベースのユーザープロフィールを更新
      const { imageUrl } = await updateProfileImage(fileKey);

      // ステップ5: 親コンポーネントに通知
      onUploadSuccess(imageUrl);
    } catch (error) {
      onUploadError(
        error instanceof Error ? error.message : "アップロードに失敗しました",
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const uploadButtonClassName = [
    styles.uploadButton,
    isUploading && styles.uploadButtonActive,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className={styles.hiddenInput}
      />

      <div className={styles.avatarWrapper}>
        {currentImageUrl ? (
          <Image
            src={currentImageUrl}
            alt="プロフィール画像"
            fill
            className={styles.avatarImage}
            sizes="128px"
          />
        ) : (
          <div className={styles.avatarPlaceholder}>👤</div>
        )}

        <Button
          variant="ghost"
          onClick={handleUploadClick}
          disabled={disabled || isUploading}
          className={uploadButtonClassName}
        >
          <div className={styles.uploadContent}>
            {isUploading ? (
              <>
                <span className={styles.uploadText}>アップロード中...</span>
                <span className={styles.uploadText}>{uploadProgress}%</span>
              </>
            ) : (
              <span className={styles.uploadText}>写真を変更</span>
            )}
          </div>
        </Button>
      </div>

      {isUploading && (
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      <div className={styles.note}>JPG、PNG、またはWebP • 最大5MB</div>
    </div>
  );
}
