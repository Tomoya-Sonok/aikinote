"use client";

import Image from "next/image";
import type { FC } from "react";
import styles from "./MediaPlayer.module.css";

interface MediaPlayerProps {
  type: "image" | "video" | "youtube";
  url: string;
  thumbnailUrl?: string | null;
  alt?: string;
}

// YouTube URLからビデオIDを抽出
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

export const MediaPlayer: FC<MediaPlayerProps> = ({
  type,
  url,
  thumbnailUrl,
  alt = "メディア",
}) => {
  if (type === "youtube") {
    const videoId = extractYouTubeVideoId(url);

    if (!videoId) {
      return (
        <div className={styles.container}>
          <div className={styles.aspectRatio}>
            <div className={styles.fallback}>動画を読み込めません</div>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <div className={styles.aspectRatio}>
          <iframe
            className={styles.iframe}
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title={alt}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className={styles.container}>
        <div className={styles.aspectRatio}>
          {/* biome-ignore lint/a11y/useMediaCaption: 稽古動画のキャプション不要 */}
          <video
            className={styles.video}
            src={url}
            controls
            preload="metadata"
            poster={thumbnailUrl ?? undefined}
          />
        </div>
      </div>
    );
  }

  // image
  return (
    <div className={styles.container}>
      <div className={styles.aspectRatio}>
        <Image
          src={url}
          alt={alt}
          fill
          className={styles.image}
          sizes="(max-width: 580px) 100vw, 580px"
        />
      </div>
    </div>
  );
};
