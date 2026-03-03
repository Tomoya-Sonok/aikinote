"use client";

import { Image as ImageIcon, VideoCamera } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useCallback, useRef, useState } from "react";
import type { AttachmentData } from "../AttachmentCard/AttachmentCard";
import { AttachmentCard } from "../AttachmentCard/AttachmentCard";
import styles from "./AttachmentUpload.module.css";

interface AttachmentUploadProps {
  attachments: AttachmentData[];
  onAttachmentAdd: (attachment: AttachmentData) => void;
  onAttachmentDelete: (id: string) => void;
  disabled?: boolean;
  pageId?: string; // 編集時には既にpageIdがある
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
}) => {
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubePreview, setYoutubePreview] = useState<YouTubeOgpData | null>(
    null,
  );
  const [isLoadingYoutube, setIsLoadingYoutube] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ファイル選択
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setError(null);
      setIsUploading(true);
      setUploadProgress(0);
      setUploadingFileName(file.name);

      try {
        // ステップ1: 署名付きURL取得
        const response = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
            uploadType: "page-attachment",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || t("pageModal.attachments.uploadFailed"),
          );
        }

        const { uploadUrl, fileKey }: UploadResponse = await response.json();

        // ステップ2: S3にアップロード
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          });

          xhr.addEventListener("load", () => {
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
            reject(new Error(t("pageModal.attachments.uploadFailed")));
          });

          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        // ステップ3: 添付データを追加
        const isVideo = file.type.startsWith("video/");
        const cloudFrontDomain =
          process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || "";

        const newAttachment: AttachmentData = {
          id: generateTempId(),
          type: isVideo ? "video" : "image",
          url: `https://${cloudFrontDomain}/${fileKey}`,
          original_filename: file.name,
          file_size_bytes: file.size,
        };

        onAttachmentAdd({
          ...newAttachment,
          // file_key を添付データに含める（POST /api/page-attachments 用）
          ...({ _fileKey: fileKey } as Record<string, string>),
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t("pageModal.attachments.uploadFailed"),
        );
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadingFileName("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [onAttachmentAdd, t],
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
    [onAttachmentAdd],
  );

  const handleUploadClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.container}>
      <span className={styles.label}>{t("pageModal.attachments.title")}</span>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className={styles.hiddenInput}
      />

      {/* ファイルアップロードボタン */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.fileButton}
          onClick={handleUploadClick}
          disabled={disabled || isUploading}
        >
          <ImageIcon size={16} />
          <VideoCamera size={16} />
          {t("pageModal.attachments.addFile")}
        </button>
      </div>

      {/* アップロード進捗 */}
      {isUploading && (
        <div className={styles.progressContainer}>
          <div className={styles.progressInfo}>
            <span>{uploadingFileName}</span>
            <span>{uploadProgress}%</span>
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
        <div className={styles.youtubeInputRow}>
          <input
            type="url"
            className={styles.youtubeInput}
            placeholder={t("pageModal.attachments.youtubeUrlPlaceholder")}
            value={youtubeUrl}
            onChange={(e) => handleYoutubeUrlChange(e.target.value)}
            disabled={disabled || isUploading}
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
