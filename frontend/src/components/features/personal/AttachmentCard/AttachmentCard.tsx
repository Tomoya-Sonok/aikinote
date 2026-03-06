"use client";

import {
  Image as ImageIcon,
  VideoCamera,
  X,
  YoutubeLogo,
} from "@phosphor-icons/react";
import type { FC } from "react";
import { Button } from "@/components/shared/Button/Button";
import { MediaPlayer } from "../MediaPlayer/MediaPlayer";
import styles from "./AttachmentCard.module.css";

export interface AttachmentData {
  id: string;
  type: "image" | "video" | "youtube";
  url: string;
  thumbnail_url?: string | null;
  original_filename?: string | null;
  file_size_bytes?: number | null;
  youtubeTitle?: string;
}

interface AttachmentCardProps {
  attachment: AttachmentData;
  onDelete?: (id: string) => void;
  showDeleteButton?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const typeIcons = {
  image: ImageIcon,
  video: VideoCamera,
  youtube: YoutubeLogo,
};

export const AttachmentCard: FC<AttachmentCardProps> = ({
  attachment,
  onDelete,
  showDeleteButton = true,
}) => {
  const Icon = typeIcons[attachment.type];

  return (
    <div className={styles.card}>
      {showDeleteButton && onDelete && (
        <Button
          variant="ghost"
          className={styles.deleteButton}
          onClick={() => onDelete(attachment.id)}
          aria-label="削除"
        >
          <X size={14} weight="bold" />
        </Button>
      )}

      <MediaPlayer
        type={attachment.type}
        url={attachment.url}
        thumbnailUrl={attachment.thumbnail_url}
        alt={attachment.original_filename ?? "添付ファイル"}
      />

      {attachment.type === "youtube" && attachment.youtubeTitle && (
        <div className={styles.youtubeTitle}>{attachment.youtubeTitle}</div>
      )}

      <div className={styles.meta}>
        <Icon size={14} />
        {attachment.original_filename && (
          <span>{attachment.original_filename}</span>
        )}
        {attachment.file_size_bytes && (
          <span> ({formatFileSize(attachment.file_size_bytes)})</span>
        )}
      </div>
    </div>
  );
};
