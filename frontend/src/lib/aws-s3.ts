import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

type AwsConfig = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
};

let cachedConfig: AwsConfig | null = null;
let cachedS3Client: S3Client | null = null;

const loadAwsConfig = (): AwsConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_S3_BUCKET_NAME;

  const missingKeys = [
    !region ? "AWS_REGION" : null,
    !accessKeyId ? "AWS_ACCESS_KEY_ID" : null,
    !secretAccessKey ? "AWS_SECRET_ACCESS_KEY" : null,
    !bucketName ? "AWS_S3_BUCKET_NAME" : null,
  ].filter(Boolean);

  if (missingKeys.length > 0) {
    throw new Error(
      `S3連携に必要な環境変数が見つかりません: ${missingKeys.join(", ")}`,
    );
  }

  cachedConfig = {
    region: region as string,
    accessKeyId: accessKeyId as string,
    secretAccessKey: secretAccessKey as string,
    bucketName: bucketName as string,
  };

  return cachedConfig;
};

const getS3Client = (): S3Client => {
  if (cachedS3Client) {
    return cachedS3Client;
  }

  const { region, accessKeyId, secretAccessKey } = loadAwsConfig();

  cachedS3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return cachedS3Client;
};

// サポートされる画像形式
const SUPPORTED_FORMATS = ["jpg", "jpeg", "png", "webp"] as const;
type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

// ファイル形式の検証
export function validateImageType(filename: string): boolean {
  const extension = filename.toLowerCase().split(".").pop();
  return SUPPORTED_FORMATS.includes(extension as SupportedFormat);
}

// ユーザープロフィール画像用の一意なファイルキー生成
export function generateProfileImageKey(
  userId: string,
  originalFilename: string,
): string {
  const extension = originalFilename.toLowerCase().split(".").pop();
  const uuid = uuidv4();
  return `users/${userId}/avatar-${uuid}.${extension}`;
}

// S3アップロード用の署名付きURL生成
export async function generateUploadSignedUrl(
  userId: string,
  filename: string,
  contentType: string,
): Promise<{ uploadUrl: string; fileKey: string }> {
  if (!validateImageType(filename)) {
    throw new Error(
      "サポートされていないファイル形式です。jpg、jpeg、png、webpのみ許可されています。",
    );
  }

  const fileKey = generateProfileImageKey(userId, filename);
  const { bucketName } = loadAwsConfig();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    ContentType: contentType,
    Tagging: "public=true",
    Metadata: {
      "uploaded-by": userId,
      "upload-type": "profile-image",
    },
  });

  // 15分で期限切れになる署名付きURLを生成
  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: 15 * 60, // 15分
  });

  return { uploadUrl, fileKey };
}

// S3からファイルを削除
export async function deleteFileFromS3(fileKey: string): Promise<void> {
  const { bucketName } = loadAwsConfig();
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
  });

  await getS3Client().send(command);
}

// S3 URLからファイルキーを抽出
export function extractFileKeyFromUrl(s3Url: string): string | null {
  try {
    const { bucketName } = loadAwsConfig();
    const url = new URL(s3Url);
    // パススタイルとバーチャルホスト形式の両方に対応
    const pathSegments = url.pathname.split("/").filter(Boolean);

    if (url.hostname.includes("amazonaws.com")) {
      // 以下のようなURL形式に対応:
      // https://bucket.s3.region.amazonaws.com/path/to/file
      // https://s3.region.amazonaws.com/bucket/path/to/file
      if (url.hostname.startsWith(bucketName)) {
        // バーチャルホスト形式: bucket.s3.region.amazonaws.com
        return pathSegments.join("/");
      } else {
        // パス形式: s3.region.amazonaws.com/bucket/...
        return pathSegments.slice(1).join("/");
      }
    }

    return null;
  } catch {
    return null;
  }
}

// アップロードされたファイルの公開URL生成（CloudFrontまたは公開バケットを想定）
export function generatePublicUrl(fileKey: string): string {
  // CloudFrontドメインを使用（環境変数で設定可能）
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
  if (!cloudFrontDomain) {
    throw new Error("CLOUDFRONT_DOMAIN 環境変数が設定されていません");
  }
  return `https://${cloudFrontDomain}/${fileKey}`;
}

// ---- ページ添付ファイル関連 ----

// サポートされるメディア形式（画像 + 動画）
const SUPPORTED_IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp"] as const;
const SUPPORTED_VIDEO_FORMATS = ["mp4", "mov", "webm"] as const;
const SUPPORTED_MEDIA_FORMATS = [
  ...SUPPORTED_IMAGE_FORMATS,
  ...SUPPORTED_VIDEO_FORMATS,
] as const;
type SupportedMediaFormat = (typeof SUPPORTED_MEDIA_FORMATS)[number];

// メディアファイル形式の検証（画像 + 動画）
export function validateMediaType(filename: string): boolean {
  const extension = filename.toLowerCase().split(".").pop();
  return SUPPORTED_MEDIA_FORMATS.includes(extension as SupportedMediaFormat);
}

// ファイルが画像か動画かを判定
export function getMediaCategory(filename: string): "image" | "video" | null {
  const extension = filename.toLowerCase().split(".").pop();
  if (
    SUPPORTED_IMAGE_FORMATS.includes(
      extension as (typeof SUPPORTED_IMAGE_FORMATS)[number],
    )
  ) {
    return "image";
  }
  if (
    SUPPORTED_VIDEO_FORMATS.includes(
      extension as (typeof SUPPORTED_VIDEO_FORMATS)[number],
    )
  ) {
    return "video";
  }
  return null;
}

// サイズ制限定数
export const ATTACHMENT_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  video: 300 * 1024 * 1024, // 300MB
} as const;

// ページ添付ファイル用の一意なファイルキー生成
export function generateAttachmentKey(
  userId: string,
  originalFilename: string,
): string {
  const extension = originalFilename.toLowerCase().split(".").pop();
  const uuid = uuidv4();
  return `users/${userId}/page-attachments/${uuid}.${extension}`;
}

// ソーシャル投稿添付ファイル用の一意なファイルキー生成
export function generateSocialPostAttachmentKey(
  userId: string,
  originalFilename: string,
): string {
  const extension = originalFilename.toLowerCase().split(".").pop();
  const uuid = uuidv4();
  return `users/${userId}/social-post-attachments/${uuid}.${extension}`;
}

// メディアアップロード用の署名付きURL生成（共通）
async function generateMediaUploadSignedUrl(
  userId: string,
  filename: string,
  contentType: string,
  fileSize: number,
  keyGenerator: (userId: string, filename: string) => string,
  uploadType: string,
): Promise<{ uploadUrl: string; fileKey: string }> {
  if (!validateMediaType(filename)) {
    throw new Error(
      "サポートされていないファイル形式です。jpg、jpeg、png、webp、mp4、mov、webmのみ許可されています。",
    );
  }

  const mediaCategory = getMediaCategory(filename);
  if (!mediaCategory) {
    throw new Error("ファイル形式を判定できません。");
  }

  const sizeLimit = ATTACHMENT_SIZE_LIMITS[mediaCategory];
  if (fileSize > sizeLimit) {
    const limitMB = sizeLimit / (1024 * 1024);
    throw new Error(`ファイルサイズが制限（${limitMB}MB）を超えています。`);
  }

  const fileKey = keyGenerator(userId, filename);
  const { bucketName } = loadAwsConfig();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    ContentType: contentType,
    Tagging: "public=true",
    Metadata: {
      "uploaded-by": userId,
      "upload-type": uploadType,
    },
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: 15 * 60,
  });

  return { uploadUrl, fileKey };
}

// ソーシャル投稿添付ファイルアップロード用の署名付きURL生成
export async function generateSocialPostAttachmentUploadSignedUrl(
  userId: string,
  filename: string,
  contentType: string,
  fileSize: number,
): Promise<{ uploadUrl: string; fileKey: string }> {
  return generateMediaUploadSignedUrl(
    userId,
    filename,
    contentType,
    fileSize,
    generateSocialPostAttachmentKey,
    "social-post-attachment",
  );
}

// ページ添付ファイルアップロード用の署名付きURL生成
export async function generateAttachmentUploadSignedUrl(
  userId: string,
  filename: string,
  contentType: string,
  fileSize: number,
): Promise<{ uploadUrl: string; fileKey: string }> {
  return generateMediaUploadSignedUrl(
    userId,
    filename,
    contentType,
    fileSize,
    generateAttachmentKey,
    "page-attachment",
  );
}
