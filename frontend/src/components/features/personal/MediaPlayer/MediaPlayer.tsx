"use client";

import Image from "next/image";
import {
  type CSSProperties,
  type FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { buildYouTubeEmbedSrc } from "@/lib/utils/youtube";
import styles from "./MediaPlayer.module.css";

interface MediaPlayerProps {
  type: "image" | "video" | "youtube";
  url: string;
  thumbnailUrl?: string | null;
  alt?: string;
  fillParent?: boolean;
  onImageLoad?: (naturalWidth: number, naturalHeight: number) => void;
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
  const [isLandscape, setIsLandscape] = useState(false);

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      if (!fillParent && naturalHeight > naturalWidth) {
        setPortraitStyle({
          paddingTop: 0,
          aspectRatio: `${naturalWidth} / ${naturalHeight}`,
        });
      }
      if (naturalWidth > naturalHeight) {
        setIsLandscape(true);
      }
      onImageLoad?.(naturalWidth, naturalHeight);
    },
    [fillParent, onImageLoad],
  );

  const containerClass = `${styles.container} ${fillParent ? styles.fillParent : ""} ${isLandscape ? styles.containerLandscape : ""}`;
  const aspectClass = `${styles.aspectRatio} ${fillParent ? styles.fillParentAspect : ""}`;
  if (type === "youtube") {
    const embedSrc = buildYouTubeEmbedSrc(url);

    if (!embedSrc) {
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
            src={embedSrc}
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
      <VideoPlayer
        url={url}
        thumbnailUrl={thumbnailUrl}
        containerClass={containerClass}
        aspectClass={aspectClass}
      />
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
          className={`${styles.image} ${isLandscape ? styles.imageLandscape : ""}`}
          sizes="(max-width: 580px) 100vw, 580px"
          onLoad={handleImageLoad}
        />
      </div>
    </div>
  );
};

interface VideoPlayerProps {
  url: string;
  thumbnailUrl?: string | null;
  containerClass: string;
  aspectClass: string;
}

/**
 * ビューポート内に入るまで `<video preload="none">` とし、メタデータ取得を遅延させる。
 * 投稿一覧のように複数動画が縦に並ぶ画面で、画面外動画のメタデータリクエストを抑制して
 * 初期ロード時の帯域・メモリ消費を削減する。
 */
const VideoPlayer: FC<VideoPlayerProps> = ({
  url,
  thumbnailUrl,
  containerClass,
  aspectClass,
}) => {
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node || hasEnteredViewport) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setHasEnteredViewport(true);
            observer.disconnect();
            observerRef.current = null;
          }
        },
        { rootMargin: "200px" },
      );
      observer.observe(node);
      observerRef.current = observer;
    },
    [hasEnteredViewport],
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  return (
    <div className={containerClass} ref={setContainerRef}>
      <div className={aspectClass}>
        {/* biome-ignore lint/a11y/useMediaCaption: 稽古動画のキャプション不要 */}
        <video
          className={styles.video}
          src={url}
          controls
          preload={hasEnteredViewport ? "metadata" : "none"}
          poster={thumbnailUrl ?? undefined}
        />
      </div>
    </div>
  );
};
