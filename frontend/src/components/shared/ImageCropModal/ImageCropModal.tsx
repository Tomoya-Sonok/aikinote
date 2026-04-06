"use client";

import * as Slider from "@radix-ui/react-slider";
import { useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { Area } from "react-easy-crop";
import Cropper from "react-easy-crop";
import { Button } from "@/components/shared/Button/Button";
import { cropImage } from "@/lib/utils/cropImage";
import styles from "./ImageCropModal.module.css";

export interface CropResult {
  blob: Blob;
  previewUrl: string;
}

interface ImageCropModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onConfirm: (result: CropResult) => void;
  onCancel: () => void;
  outputSize?: number;
  cropShape?: "round" | "rect";
}

export function ImageCropModal({
  isOpen,
  imageUrl,
  onConfirm,
  onCancel,
  outputSize = 512,
  cropShape = "round",
}: ImageCropModalProps) {
  const t = useTranslations();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (!imageUrl || !croppedAreaPixels || isProcessing) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await cropImage(imageUrl, croppedAreaPixels, {
        outputSize,
        outputType: "image/jpeg",
        quality: 0.92,
      });

      const previewUrl = URL.createObjectURL(croppedBlob);
      onConfirm({ blob: croppedBlob, previewUrl });

      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } finally {
      setIsProcessing(false);
    }
  }, [imageUrl, croppedAreaPixels, isProcessing, outputSize, onConfirm]);

  const handleCancel = useCallback(() => {
    if (isProcessing) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onCancel();
  }, [isProcessing, onCancel]);

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !isProcessing) {
      handleCancel();
    }
  };

  const handleBackdropClick = () => {
    if (!isProcessing) {
      handleCancel();
    }
  };

  const handleZoomChange = useCallback((value: number[]) => {
    setZoom(value[0]);
  }, []);

  if (!isOpen || !imageUrl) return null;

  return createPortal(
    <div className={styles.overlay} role="presentation">
      <button
        type="button"
        className={styles.overlayDismiss}
        onClick={handleBackdropClick}
        aria-label={t("imageCropModal.cancel")}
        disabled={isProcessing}
      />
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        <h2 className={styles.title} id={titleId}>
          {t("imageCropModal.title")}
        </h2>

        <div className={styles.cropperContainer}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className={styles.zoomControl}>
          <span className={styles.zoomLabel}>
            {t("imageCropModal.zoomLabel")}
          </span>
          <Slider.Root
            className={styles.sliderRoot}
            value={[zoom]}
            onValueChange={handleZoomChange}
            min={1}
            max={3}
            step={0.1}
          >
            <Slider.Track className={styles.sliderTrack}>
              <Slider.Range className={styles.sliderRange} />
            </Slider.Track>
            <Slider.Thumb
              className={styles.sliderThumb}
              aria-label={t("imageCropModal.zoomLabel")}
            />
          </Slider.Root>
        </div>

        <div className={styles.actions}>
          <Button
            variant="cancel"
            size="medium"
            onClick={handleCancel}
            disabled={isProcessing}
            className={styles.button}
          >
            {t("imageCropModal.cancel")}
          </Button>
          <Button
            variant="primary"
            size="medium"
            onClick={handleConfirm}
            disabled={isProcessing}
            className={styles.button}
          >
            {isProcessing
              ? t("imageCropModal.processing")
              : t("imageCropModal.confirm")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
