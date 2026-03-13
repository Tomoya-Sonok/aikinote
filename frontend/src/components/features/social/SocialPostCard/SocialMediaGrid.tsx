"use client";

import type { FC } from "react";
import { MediaPlayer } from "@/components/features/personal/MediaPlayer/MediaPlayer";
import styles from "./SocialMediaGrid.module.css";

interface MediaItem {
  id: string;
  type: string;
  url: string;
  thumbnail_url: string | null;
  original_filename: string | null;
}

interface SocialMediaGridProps {
  attachments: MediaItem[];
}

const getMediaType = (type: string): "image" | "video" | "youtube" => {
  if (type === "video") return "video";
  if (type === "youtube") return "youtube";
  return "image";
};

export const SocialMediaGrid: FC<SocialMediaGridProps> = ({ attachments }) => {
  if (attachments.length === 0) return null;

  const count = Math.min(attachments.length, 4);
  const gridClass =
    count === 1
      ? styles.gridSingle
      : count === 2
        ? styles.gridDouble
        : styles.gridMultiple;

  return (
    <div className={`${styles.grid} ${gridClass}`}>
      {attachments.slice(0, 4).map((attachment) => (
        <div key={attachment.id} className={styles.mediaItem}>
          <MediaPlayer
            type={getMediaType(attachment.type)}
            url={attachment.url}
            thumbnailUrl={attachment.thumbnail_url}
            alt={attachment.original_filename || ""}
          />
        </div>
      ))}
    </div>
  );
};
