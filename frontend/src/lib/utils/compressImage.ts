/**
 * クライアントサイドの画像リサイズ・圧縮ユーティリティ
 *
 * プロフィール画像用に、アップロード前に画像を適切なサイズに
 * リサイズし、ファイルサイズを圧縮する。
 * Canvas APIを使用するため外部依存なし。
 */

export interface CompressImageOptions {
  /** 最大幅（px） */
  maxWidth?: number;
  /** 最大高さ（px） */
  maxHeight?: number;
  /** 出力品質（0〜1） */
  quality?: number;
  /** 出力形式 */
  outputType?: "image/jpeg" | "image/webp";
  /** 目標ファイルサイズ（バイト） */
  maxFileSize?: number;
}

const DEFAULT_OPTIONS: Required<CompressImageOptions> = {
  maxWidth: 512,
  maxHeight: 512,
  quality: 0.85,
  outputType: "image/jpeg",
  maxFileSize: 1024 * 1024, // 1MB
};

/**
 * File → HTMLImageElement に変換
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("画像の読み込みに失敗しました"));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * リサイズ後のサイズを計算（アスペクト比を維持）
 */
function calculateResizedDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // 最大サイズ以内ならそのまま
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const aspectRatio = width / height;

  if (width > height) {
    width = maxWidth;
    height = Math.round(width / aspectRatio);
    if (height > maxHeight) {
      height = maxHeight;
      width = Math.round(height * aspectRatio);
    }
  } else {
    height = maxHeight;
    width = Math.round(height * aspectRatio);
    if (width > maxWidth) {
      width = maxWidth;
      height = Math.round(width / aspectRatio);
    }
  }

  return { width, height };
}

/**
 * Canvas で画像をリサイズし、指定品質で Blob に変換
 */
function canvasToBlob(
  img: HTMLImageElement,
  width: number,
  height: number,
  outputType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas 2D コンテキストの取得に失敗しました"));
      return;
    }

    // 高品質リサイズ
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

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

/**
 * 画像ファイルをリサイズ・圧縮して File として返す
 *
 * 品質を段階的に下げながら目標ファイルサイズ以下になるまで圧縮する。
 *
 * @example
 * ```ts
 * const compressed = await compressImage(originalFile, {
 *   maxWidth: 512,
 *   maxHeight: 512,
 *   maxFileSize: 1024 * 1024, // 1MB
 * });
 * ```
 */
export async function compressImage(
  file: File,
  options?: CompressImageOptions,
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 画像を読み込み
  const img = await loadImage(file);

  // リサイズ後のサイズを計算
  const { width, height } = calculateResizedDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidth,
    opts.maxHeight,
  );

  // 元画像がリサイズ不要かつファイルサイズ制限内ならそのまま返す
  if (
    width === img.naturalWidth &&
    height === img.naturalHeight &&
    file.size <= opts.maxFileSize
  ) {
    return file;
  }

  // 品質を段階的に下げながら目標サイズ以下を目指す
  let quality = opts.quality;
  const minQuality = 0.4;
  const qualityStep = 0.1;

  let blob = await canvasToBlob(img, width, height, opts.outputType, quality);

  while (blob.size > opts.maxFileSize && quality > minQuality) {
    quality -= qualityStep;
    blob = await canvasToBlob(img, width, height, opts.outputType, quality);
  }

  // 圧縮後のファイル名を生成（拡張子を出力形式に合わせる）
  const extension = opts.outputType === "image/webp" ? ".webp" : ".jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const compressedFileName = `${baseName}${extension}`;

  return new File([blob], compressedFileName, {
    type: opts.outputType,
    lastModified: Date.now(),
  });
}
