"use client";

import Image from "next/image";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";
import styles from "./HeroCarousel.module.css";

interface HeroCarouselItem {
  src: string;
  alt: string;
  caption: string;
  dotLabel: string;
}

interface HeroCarouselProps {
  items: HeroCarouselItem[];
}

export function HeroCarousel({ items }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const widthRef = useRef(1);
  const dragOffsetRef = useRef(0);

  if (items.length === 0) {
    return null;
  }

  const getContainerWidth = () =>
    containerRef.current?.clientWidth
      ? Math.max(containerRef.current.clientWidth, 1)
      : 1;

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (items.length <= 1) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    widthRef.current = getContainerWidth();
    dragOffsetRef.current = 0;
    setIsDragging(true);
    setDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) {
      return;
    }

    const delta = event.clientX - startXRef.current;
    dragOffsetRef.current = delta;
    setDragOffset(delta);
  };

  const settleToSlide = () => {
    const delta = dragOffsetRef.current;
    const threshold = widthRef.current * 0.2;
    let nextIndex = currentIndex;

    if (delta <= -threshold && currentIndex < items.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (delta >= threshold && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    }

    setCurrentIndex(nextIndex);
    setDragOffset(0);
    setIsDragging(false);
    dragOffsetRef.current = 0;
    pointerIdRef.current = null;
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    settleToSlide();
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    settleToSlide();
  };

  const handleSelect = (index: number) => {
    setCurrentIndex(index);
    setDragOffset(0);
    setIsDragging(false);
    dragOffsetRef.current = 0;
    pointerIdRef.current = null;
  };

  const translatePercentage =
    -100 * currentIndex +
    (isDragging ? (dragOffset / widthRef.current) * 100 : 0);

  return (
    <div className={styles.carousel} aria-live="polite">
      <div
        ref={containerRef}
        className={styles.viewport}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div
          className={`${styles.track} ${isDragging ? styles.trackDragging : ""}`}
          style={{ transform: `translateX(${translatePercentage}%)` }}
        >
          {items.map((item, index) => (
            <div
              key={item.src}
              className={styles.slide}
              aria-hidden={index !== currentIndex}
            >
              <Image
                src={item.src}
                alt={item.alt}
                width={360}
                height={640}
                sizes="(min-width: 768px) 360px, 80vw"
                className={styles.image}
                priority={index === 0}
              />
              <p className={styles.caption}>{item.caption}</p>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.dots} role="tablist">
        {items.map((item, index) => (
          <button
            key={`${item.src}-dot`}
            type="button"
            className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ""}`}
            onClick={() => handleSelect(index)}
            aria-label={item.dotLabel}
            aria-selected={index === currentIndex}
            role="tab"
          />
        ))}
      </div>
    </div>
  );
}
