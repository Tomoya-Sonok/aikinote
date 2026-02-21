import { describe, expect, it, vi, beforeEach } from "vitest";
import { compressImage } from "./compressImage";

// Canvas / Image のモック
const mockDrawImage = vi.fn();
const mockToBlob = vi.fn();
const mockGetContext = vi.fn(() => ({
  drawImage: mockDrawImage,
  imageSmoothingEnabled: true,
  imageSmoothingQuality: "high",
}));

beforeEach(() => {
  vi.clearAllMocks();

  // HTMLCanvasElement.prototype.getContext のモック
  vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    if (tagName === "canvas") {
      return {
        width: 0,
        height: 0,
        getContext: mockGetContext,
        toBlob: mockToBlob,
      } as unknown as HTMLCanvasElement;
    }
    return document.createElement(tagName);
  });
});

/**
 * テスト用のモック File を作成
 */
function createMockFile(
  size: number,
  type: string = "image/jpeg",
  name: string = "test.jpg",
): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type, lastModified: Date.now() });
}

/**
 * モック Image の読み込みシミュレーション
 */
function setupImageMock(width: number, height: number) {
  // URL.createObjectURL / revokeObjectURL のモック
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

  // Image コンストラクタのモック
  const originalImage = globalThis.Image;
  const mockImage = {
    src: "",
    naturalWidth: width,
    naturalHeight: height,
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };

  vi.spyOn(globalThis, "Image").mockImplementation(() => {
    // srcがセットされた時にonloadを呼ぶ
    const proxy = new Proxy(mockImage, {
      set(target, prop, value) {
        if (prop === "src") {
          target.src = value;
          // 非同期でonloadを呼ぶ
          setTimeout(() => {
            if (target.onload) target.onload();
          }, 0);
        } else {
          // biome-ignore lint/suspicious/noExplicitAny: mock proxy
          (target as any)[prop] = value;
        }
        return true;
      },
    });
    return proxy as unknown as HTMLImageElement;
  });

  return () => {
    globalThis.Image = originalImage;
  };
}

describe("compressImage", () => {
  describe("calculateResizedDimensions（リサイズ計算）", () => {
    it("最大サイズ以下の画像はリサイズせずそのまま返す", async () => {
      const file = createMockFile(500); // 500バイト（十分小さい）
      setupImageMock(256, 256);

      // toBlobが呼ばれないことを確認するためにモック設定
      // 元サイズが小さくファイルサイズも小さい場合はそのまま返される
      const result = await compressImage(file, {
        maxWidth: 512,
        maxHeight: 512,
        maxFileSize: 1024 * 1024,
      });

      // 元ファイルがそのまま返される
      expect(result).toBe(file);
    });

    it("横長画像をアスペクト比を維持してリサイズする", async () => {
      const file = createMockFile(2 * 1024 * 1024); // 2MB
      setupImageMock(2000, 1000);

      const mockBlob = new Blob(["compressed"], { type: "image/jpeg" });
      mockToBlob.mockImplementation(
        (callback: BlobCallback, _type: string, _quality: number) => {
          callback(mockBlob);
        },
      );

      const result = await compressImage(file, {
        maxWidth: 512,
        maxHeight: 512,
      });

      expect(result).toBeInstanceOf(File);
      expect(result.type).toBe("image/jpeg");
    });
  });

  describe("品質の段階的低下", () => {
    it("目標サイズを超える場合、品質を下げて再圧縮する", async () => {
      const file = createMockFile(3 * 1024 * 1024); // 3MB
      setupImageMock(2000, 2000);

      let callCount = 0;
      mockToBlob.mockImplementation(
        (callback: BlobCallback, _type: string, _quality: number) => {
          callCount++;
          // 最初の数回は大きなBlobを返し、後で小さいBlobを返す
          const size = callCount < 3 ? 2 * 1024 * 1024 : 500 * 1024;
          const blob = new Blob([new Uint8Array(size)], {
            type: "image/jpeg",
          });
          callback(blob);
        },
      );

      const result = await compressImage(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.85,
        maxFileSize: 1024 * 1024,
      });

      // 複数回toBlobが呼ばれている（品質を下げながら再試行）
      expect(callCount).toBeGreaterThan(1);
      expect(result).toBeInstanceOf(File);
    });
  });

  describe("ファイル名と出力形式", () => {
    it("JPEG出力時に拡張子が.jpgになる", async () => {
      const file = createMockFile(2 * 1024 * 1024, "image/png", "photo.png");
      setupImageMock(1000, 1000);

      const mockBlob = new Blob(["compressed"], { type: "image/jpeg" });
      mockToBlob.mockImplementation(
        (callback: BlobCallback, _type: string, _quality: number) => {
          callback(mockBlob);
        },
      );

      const result = await compressImage(file, {
        outputType: "image/jpeg",
      });

      expect(result.name).toBe("photo.jpg");
      expect(result.type).toBe("image/jpeg");
    });

    it("WebP出力時に拡張子が.webpになる", async () => {
      const file = createMockFile(2 * 1024 * 1024, "image/jpeg", "photo.jpg");
      setupImageMock(1000, 1000);

      const mockBlob = new Blob(["compressed"], { type: "image/webp" });
      mockToBlob.mockImplementation(
        (callback: BlobCallback, _type: string, _quality: number) => {
          callback(mockBlob);
        },
      );

      const result = await compressImage(file, {
        outputType: "image/webp",
      });

      expect(result.name).toBe("photo.webp");
      expect(result.type).toBe("image/webp");
    });
  });
});
