"use client";

import { type ChangeEvent, useCallback, useRef, useState } from "react";
import type { CropResult } from "@/components/shared/ImageCropModal/ImageCropModal";
import { compressImage } from "@/lib/utils/compressImage";

export function useProfileImageUpload() {
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const rawImageUrlRef = useRef<string | null>(null);

  const handleImageSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // 古い rawImageUrl のクリーンアップ
      if (rawImageUrlRef.current) {
        URL.revokeObjectURL(rawImageUrlRef.current);
      }

      const url = URL.createObjectURL(file);
      rawImageUrlRef.current = url;
      setRawImageUrl(url);
    },
    [],
  );

  const handleCropComplete = useCallback(async (result: CropResult) => {
    const croppedFile = new File([result.blob], "cropped-profile.jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    const compressedFile = await compressImage(croppedFile, {
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.85,
      outputType: "image/jpeg",
      maxFileSize: 1024 * 1024,
    });

    setProfileImageFile(compressedFile);

    // 古いプレビューURLのクリーンアップ
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = result.previewUrl;
    setPreviewUrl(result.previewUrl);

    // rawImageUrl のクリーンアップ
    if (rawImageUrlRef.current) {
      URL.revokeObjectURL(rawImageUrlRef.current);
      rawImageUrlRef.current = null;
    }
    setRawImageUrl(null);
  }, []);

  const handleCropCancel = useCallback(() => {
    if (rawImageUrlRef.current) {
      URL.revokeObjectURL(rawImageUrlRef.current);
      rawImageUrlRef.current = null;
    }
    setRawImageUrl(null);
  }, []);

  // 既存互換: profile-image-upload.tsx が使用中
  const handleImageChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>, onError?: () => void) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const compressedFile = await compressImage(file, {
          maxWidth: 512,
          maxHeight: 512,
          quality: 0.85,
          outputType: "image/jpeg",
          maxFileSize: 1024 * 1024,
        });
        setProfileImageFile(compressedFile);

        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }

        const url = URL.createObjectURL(compressedFile);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      } catch {
        onError?.();
      }
    },
    [],
  );

  const handleDeleteImage = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setProfileImageFile(null);
    setPreviewUrl(null);
  }, []);

  const uploadImageToS3 = useCallback(
    async (
      file: File,
      errorMessages?: {
        uploadUrl?: string;
        s3Upload?: string;
        profileUpdate?: string;
      },
    ): Promise<string> => {
      const uploadUrlResponse = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.json();
        throw new Error(
          errorData.error ||
            errorMessages?.uploadUrl ||
            "アップロードURLの取得に失敗しました",
        );
      }

      const { uploadUrl, fileKey } = await uploadUrlResponse.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(
          errorMessages?.s3Upload || "画像のアップロードに失敗しました",
        );
      }

      const updateResponse = await fetch("/api/profile-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(
          errorData.error ||
            errorMessages?.profileUpdate ||
            "プロフィール画像の更新に失敗しました",
        );
      }

      const { imageUrl } = await updateResponse.json();
      return imageUrl;
    },
    [],
  );

  const cleanup = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (rawImageUrlRef.current) {
      URL.revokeObjectURL(rawImageUrlRef.current);
      rawImageUrlRef.current = null;
    }
  }, []);

  return {
    profileImageFile,
    previewUrl,
    rawImageUrl,
    handleImageSelect,
    handleCropComplete,
    handleCropCancel,
    handleImageChange,
    handleDeleteImage,
    uploadImageToS3,
    cleanup,
  };
}
