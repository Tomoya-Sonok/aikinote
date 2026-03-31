"use client";

import useEmblaCarousel from "embla-carousel-react";
import {
  type CSSProperties,
  type FC,
  useCallback,
  useEffect,
  useState,
} from "react";
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

function SingleImage({ image }: { image: MediaItem }) {
  const [aspectStyle, setAspectStyle] = useState<CSSProperties | undefined>();

  const handleImageLoad = useCallback((w: number, h: number) => {
    if (h > w) {
      setAspectStyle({ aspectRatio: `${w} / ${h}` });
    }
  }, []);

  return (
    <div className={styles.singleImage} style={aspectStyle}>
      <MediaPlayer
        type="image"
        url={image.url}
        alt={image.original_filename || ""}
        fillParent
        onImageLoad={handleImageLoad}
      />
    </div>
  );
}

function ImageCarousel({ images }: { images: MediaItem[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideRatios, setSlideRatios] = useState<Record<string, CSSProperties>>(
    {},
  );

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

  // スライドのアスペクト比変更後にEmblaを再計算
  useEffect(() => {
    if (!emblaApi || Object.keys(slideRatios).length === 0) return;
    emblaApi.reInit();
  }, [emblaApi, slideRatios]);

  const handleSlideImageLoad = useCallback(
    (id: string, w: number, h: number) => {
      if (h > w) {
        setSlideRatios((prev) => ({
          ...prev,
          [id]: { aspectRatio: `${w} / ${h}` },
        }));
      }
    },
    [],
  );

  return (
    <div className={styles.carouselWrapper}>
      <div className={styles.carousel} ref={emblaRef}>
        <div className={styles.carouselContainer}>
          {images.map((image) => (
            <div
              key={image.id}
              className={styles.carouselSlide}
              style={slideRatios[image.id]}
            >
              <MediaPlayer
                type="image"
                url={image.url}
                alt={image.original_filename || ""}
                fillParent
                onImageLoad={(w, h) => handleSlideImageLoad(image.id, w, h)}
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

      {images.length === 1 && <SingleImage image={images[0]} />}

      {images.length > 1 && <ImageCarousel images={images} />}
    </div>
  );
};
