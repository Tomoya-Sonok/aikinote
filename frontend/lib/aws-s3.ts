import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

// S3クライアントの設定
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

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

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
    Tagging: "public=true",
    Metadata: {
      "uploaded-by": userId,
      "upload-type": "profile-image",
    },
  });

  // 15分で期限切れになる署名付きURLを生成
  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 15 * 60, // 15分
  });

  return { uploadUrl, fileKey };
}

// S3からファイルを削除
export async function deleteFileFromS3(fileKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  await s3Client.send(command);
}

// S3 URLからファイルキーを抽出
export function extractFileKeyFromUrl(s3Url: string): string | null {
  try {
    const url = new URL(s3Url);
    // パススタイルとバーチャルホスト形式の両方に対応
    const pathSegments = url.pathname.split("/").filter(Boolean);

    if (url.hostname.includes("amazonaws.com")) {
      // 以下のようなURL形式に対応:
      // https://bucket.s3.region.amazonaws.com/path/to/file
      // https://s3.region.amazonaws.com/bucket/path/to/file
      if (url.hostname.startsWith(BUCKET_NAME)) {
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
  const cloudFrontDomain =
    process.env.CLOUDFRONT_DOMAIN || "d2zhlmel6ws1p9.cloudfront.net";
  return `https://${cloudFrontDomain}/${fileKey}`;
}
