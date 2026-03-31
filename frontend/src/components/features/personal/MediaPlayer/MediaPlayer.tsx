"use client";

import Image from "next/image";
import { type CSSProperties, type FC, useCallback, useState } from "react";
import styles from "./MediaPlayer.module.css";

interface MediaPlayerProps {
  type: "image" | "video" | "youtube";
  url: string;
  thumbnailUrl?: string | null;
  alt?: string;
  fillParent?: boolean;
  onImageLoad?: (naturalWidth: number, naturalHeight: number) => void;
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
  fillParent = false,
  onImageLoad,
}) => {
  const [portraitStyle, setPortraitStyle] = useState<
    CSSProperties | undefined
  >();

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      if (!fillParent && naturalHeight > naturalWidth) {
        setPortraitStyle({
          paddingTop: 0,
          aspectRatio: `${naturalWidth} / ${naturalHeight}`,
        });
      }
      onImageLoad?.(naturalWidth, naturalHeight);
    },
    [fillParent, onImageLoad],
  );

  const containerClass = `${styles.container} ${fillParent ? styles.fillParent : ""}`;
  const aspectClass = `${styles.aspectRatio} ${fillParent ? styles.fillParentAspect : ""}`;
  if (type === "youtube") {
    const videoId = extractYouTubeVideoId(url);

    if (!videoId) {
      return (
        <div className={containerClass}>
          <div className={aspectClass}>
            <div className={styles.fallback}>動画を読み込めません</div>
          </div>
        </div>
      );
    }

    return (
      <div className={containerClass}>
        <div className={aspectClass}>
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
      <div className={containerClass}>
        <div className={aspectClass}>
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
    <div className={containerClass}>
      <div className={aspectClass} style={portraitStyle}>
        <Image
          src={url}
          alt={alt}
          fill
          className={styles.image}
          sizes="(max-width: 580px) 100vw, 580px"
          onLoad={handleImageLoad}
        />
      </div>
    </div>
  );
};
