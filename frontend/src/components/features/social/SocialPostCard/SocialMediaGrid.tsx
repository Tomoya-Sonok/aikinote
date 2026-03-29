"use client";

import useEmblaCarousel from "embla-carousel-react";
import { type FC, useCallback, useEffect, useState } from "react";
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

const isVideo = (type: string) => type === "video" || type === "youtube";

const getMediaType = (type: string): "image" | "video" | "youtube" => {
  if (type === "video") return "video";
  if (type === "youtube") return "youtube";
  return "image";
};

function ImageCarousel({ images }: { images: MediaItem[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [activeIndex, setActiveIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className={styles.carouselWrapper}>
      <div className={styles.carousel} ref={emblaRef}>
        <div className={styles.carouselContainer}>
          {images.map((image) => (
            <div key={image.id} className={styles.carouselSlide}>
              <MediaPlayer
                type="image"
                url={image.url}
                alt={image.original_filename || ""}
                fillParent
              />
            </div>
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <div className={styles.dots}>
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ""}`}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`画像 ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const SocialMediaGrid: FC<SocialMediaGridProps> = ({ attachments }) => {
  if (attachments.length === 0) return null;

  const videos = attachments.filter((a) => isVideo(a.type));
  const images = attachments.filter((a) => !isVideo(a.type));

  return (
    <div className={styles.mediaSection}>
      {videos.length > 0 && (
        <div className={styles.videoStack}>
          {videos.map((video) => (
            <div key={video.id} className={styles.videoItem}>
              <MediaPlayer
                type={getMediaType(video.type)}
                url={video.url}
                thumbnailUrl={video.thumbnail_url}
                alt={video.original_filename || ""}
              />
            </div>
          ))}
        </div>
      )}

      {images.length === 1 && (
        <div className={styles.singleImage}>
          <MediaPlayer
            type="image"
            url={images[0].url}
            alt={images[0].original_filename || ""}
            fillParent
          />
        </div>
      )}

      {images.length > 1 && <ImageCarousel images={images} />}
    </div>
  );
};
