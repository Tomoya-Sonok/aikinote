"use client";

import { Image as ImageIcon, VideoCamera } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useCallback, useRef, useState } from "react";
import { ATTACHMENT_MAX_COUNT } from "@/lib/aws-s3";
import { useIsNativeApp } from "@/lib/hooks/useIsNativeApp";
import { compressImage } from "@/lib/utils/compressImage";
import type { AttachmentData } from "../AttachmentCard/AttachmentCard";
import { AttachmentCard } from "../AttachmentCard/AttachmentCard";
import styles from "./AttachmentUpload.module.css";

// Web ブラウザでは画像 + 動画を受け付ける。ネイティブアプリ (Expo WebView) では
// 動画のオフライン対応がストレージ負担の都合で未実装のため、画像のみに絞る。
const ACCEPT_WEB =
  "image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/quicktime,video/webm";
const ACCEPT_NATIVE = "image/jpeg,image/jpg,image/png,image/webp";

interface AttachmentUploadProps {
  attachments: AttachmentData[];
  onAttachmentAdd: (attachment: AttachmentData) => void;
  onAttachmentDelete: (id: string) => void;
  disabled?: boolean;
  pageId?: string; // 編集時には既にpageIdがある
  uploadType?: "page-attachment" | "social-post-attachment";
}

interface UploadResponse {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

interface YouTubeOgpData {
  title: string;
  thumbnail_url: string;
  video_id: string;
  author_name: string;
}

// 一時IDの生成
let tempIdCounter = 0;
const generateTempId = () => `temp-${Date.now()}-${++tempIdCounter}`;

export const AttachmentUpload: FC<AttachmentUploadProps> = ({
  attachments,
  onAttachmentAdd,
  onAttachmentDelete,
  disabled = false,
  uploadType = "page-attachment",
}) => {
  const t = useTranslations();
  const isNative = useIsNativeApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [_youtubePreview, setYoutubePreview] = useState<YouTubeOgpData | null>(
    null,
  );
  const [isLoadingYoutube, setIsLoadingYoutube] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // アップロードキャンセル
  const handleCancelUpload = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
    setUploadingFileName("");
  }, []);

  // 1ファイルのアップロード処理。cancel 時は Error("cancelled") を throw
  const uploadOneFile = useCallback(
    async (file: File, label: string) => {
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? 300 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(
          isVideo
            ? t("pageModal.attachments.videoFileTooLarge")
            : t("pageModal.attachments.imageFileTooLarge"),
        );
      }

      let uploadFile: File = file;
      if (!isVideo && file.type.startsWith("image/")) {
        try {
          uploadFile = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.85,
            maxFileSize: 3 * 1024 * 1024,
          });
        } catch {
          // 圧縮失敗時は元ファイルをそのまま使用
        }
      }

      setUploadProgress(0);
      setUploadingFileName(`${label}${uploadFile.name}`);

      const response = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: uploadFile.name,
          contentType: uploadFile.type,
          fileSize: uploadFile.size,
          uploadType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || t("pageModal.attachments.uploadFailed"),
        );
      }

      const { uploadUrl, fileKey }: UploadResponse = await response.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          xhrRef.current = null;
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(
              new Error(
                `${t("pageModal.attachments.uploadFailed")} (${xhr.status})`,
              ),
            );
          }
        });

        xhr.addEventListener("error", () => {
          xhrRef.current = null;
          reject(new Error(t("pageModal.attachments.uploadFailed")));
        });

        xhr.addEventListener("abort", () => {
          xhrRef.current = null;
          reject(new Error("cancelled"));
        });

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", uploadFile.type);
        xhr.send(uploadFile);
      });

      const cloudFrontDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || "";

      const newAttachment: AttachmentData = {
        id: generateTempId(),
        type: isVideo ? "video" : "image",
        url: `https://${cloudFrontDomain}/${fileKey}`,
        original_filename: uploadFile.name,
        file_size_bytes: uploadFile.size,
      };

      onAttachmentAdd({
        ...newAttachment,
        ...({ _fileKey: fileKey } as Record<string, string>),
      });
    },
    [onAttachmentAdd, t, uploadType],
  );

  // ファイル選択（複数可）。選択順に逐次アップロードして順序を保持
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(event.target.files ?? []);
      if (selected.length === 0) return;

      const clearInput = () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      };

      const available = ATTACHMENT_MAX_COUNT - attachments.length;
      if (available <= 0) {
        setError(t("pageModal.attachments.maxCountReached"));
        clearInput();
        return;
      }

      const filesToUpload = selected.slice(0, available);
      const skipped = selected.length - filesToUpload.length;

      setError(null);
      setIsUploading(true);

      let lastError: string | null = null;
      try {
        for (let i = 0; i < filesToUpload.length; i++) {
          const file = filesToUpload[i];
          const label =
            filesToUpload.length > 1
              ? `(${i + 1}/${filesToUpload.length}) `
              : "";
          try {
            await uploadOneFile(file, label);
          } catch (err) {
            if (err instanceof Error && err.message === "cancelled") {
              break;
            }
            lastError =
              err instanceof Error
                ? err.message
                : t("pageModal.attachments.uploadFailed");
          }
        }
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadingFileName("");
        clearInput();
      }

      if (lastError) {
        setError(lastError);
      } else if (skipped > 0) {
        setError(t("pageModal.attachments.maxCountReached"));
      }
    },
    [attachments.length, t, uploadOneFile],
  );

  // YouTube URL入力のデバウンスチェック
  const youtubeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleYoutubeUrlChange = useCallback(
    (url: string) => {
      setYoutubeUrl(url);
      setYoutubePreview(null);
      setError(null);

      // 前回のデバウンスをキャンセル
      if (youtubeDebounceRef.current) {
        clearTimeout(youtubeDebounceRef.current);
      }

      // YouTube URLパターンの簡易チェック
      const isYoutubeUrl =
        url.includes("youtube.com/watch") ||
        url.includes("youtu.be/") ||
        url.includes("youtube.com/shorts/");

      if (!isYoutubeUrl || url.length < 10) {
        return;
      }

      // 件数上限チェック
      if (attachments.length >= ATTACHMENT_MAX_COUNT) {
        setError(t("pageModal.attachments.maxCountReached"));
        return;
      }

      // 500ms後にoEmbed取得
      youtubeDebounceRef.current = setTimeout(async () => {
        setIsLoadingYoutube(true);

        try {
          const response = await fetch(
            `/api/ogp?url=${encodeURIComponent(url)}`,
          );

          if (!response.ok) {
            return;
          }

          const { data } = await response.json();
          setYoutubePreview(data);

          // プレビュー取得成功 → 自動で添付リストに追加
          const newAttachment: AttachmentData = {
            id: generateTempId(),
            type: "youtube",
            url: url.trim(),
            thumbnail_url: data?.thumbnail_url ?? null,
            youtubeTitle: data?.title,
          };
          onAttachmentAdd(newAttachment);
          setYoutubeUrl("");
          setYoutubePreview(null);
        } catch {
          // プレビュー取得失敗は致命的ではない
          setYoutubePreview(null);
        } finally {
          setIsLoadingYoutube(false);
        }
      }, 500);
    },
    [attachments.length, onAttachmentAdd, t],
  );

  const isMaxReached = attachments.length >= ATTACHMENT_MAX_COUNT;

  const handleUploadClick = () => {
    if (disabled || isUploading || isMaxReached) return;
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.container}>
      <span className={styles.label}>{t("pageModal.attachments.title")}</span>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={isNative ? ACCEPT_NATIVE : ACCEPT_WEB}
        onChange={handleFileSelect}
        disabled={disabled || isUploading || isMaxReached}
        className={styles.hiddenInput}
      />

      {/* ファイルアップロードボタン */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.fileButton}
          onClick={handleUploadClick}
          disabled={disabled || isUploading || isMaxReached}
          title={
            isNative
              ? t("pageModal.attachments.nativeVideoUnavailable")
              : undefined
          }
        >
          <ImageIcon size={16} />
          {/* ネイティブアプリでは動画アップロード未対応 (PR スコープ外) のため
              VideoCamera アイコンは非表示にして UI を画像のみに見せる */}
          {!isNative && <VideoCamera size={16} />}
          {t("pageModal.attachments.addFile")}
        </button>
      </div>

      {/* アップロード進捗 */}
      {isUploading && (
        <div className={styles.progressContainer}>
          <div className={styles.progressInfo}>
            <span>{uploadingFileName}</span>
            <div className={styles.progressActions}>
              <span>{uploadProgress}%</span>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleCancelUpload}
              >
                {t("pageModal.attachments.cancelUpload")}
              </button>
            </div>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* YouTube URL入力 */}
      <div className={styles.youtubeSection}>
        <p className={styles.youtubeHint}>
          {t("pageModal.attachments.youtubeHint")}
        </p>
        <div className={styles.youtubeInputRow}>
          <input
            type="url"
            className={styles.youtubeInput}
            placeholder={t("pageModal.attachments.youtubeUrlPlaceholder")}
            value={youtubeUrl}
            onChange={(e) => handleYoutubeUrlChange(e.target.value)}
            disabled={disabled || isUploading || isMaxReached}
          />
          {isLoadingYoutube && (
            <span className={styles.youtubeLoading}>...</span>
          )}
        </div>
      </div>

      {/* エラー表示 */}
      {error && <div className={styles.errorText}>{error}</div>}

      {/* 添付一覧 */}
      {attachments.length > 0 && (
        <div className={styles.attachmentList}>
          {attachments.map((attachment) => (
            <AttachmentCard
              key={attachment.id}
              attachment={attachment}
              onDelete={onAttachmentDelete}
              showDeleteButton={!disabled}
            />
          ))}
        </div>
      )}

      <div className={styles.note}>{t("pageModal.attachments.note")}</div>
    </div>
  );
};
