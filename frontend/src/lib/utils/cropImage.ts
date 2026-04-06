/**
 * 画像クロップユーティリティ
 *
 * react-easy-crop の onCropComplete が返す croppedAreaPixels を受け取り、
 * Canvas API で指定領域を切り出して正方形の Blob として返す。
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropImageOptions {
  /** 出力キャンバスのサイズ（正方形、デフォルト: 512） */
  outputSize?: number;
  /** 出力形式（デフォルト: "image/jpeg"） */
  outputType?: "image/jpeg" | "image/webp";
  /** 出力品質 0〜1（デフォルト: 0.92） */
  quality?: number;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });
}

export async function cropImage(
  imageUrl: string,
  cropAreaPixels: CropArea,
  options?: CropImageOptions,
): Promise<Blob> {
  const outputSize = options?.outputSize ?? 512;
  const outputType = options?.outputType ?? "image/jpeg";
  const quality = options?.quality ?? 0.92;

  const img = await loadImage(imageUrl);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D コンテキストの取得に失敗しました");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    img,
    cropAreaPixels.x,
    cropAreaPixels.y,
    cropAreaPixels.width,
    cropAreaPixels.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("画像の変換に失敗しました"));
          return;
        }
        resolve(blob);
      },
      outputType,
      quality,
    );
  });
}
