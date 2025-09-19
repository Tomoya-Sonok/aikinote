# プロフィール画像システム仕様書

AikiNoteにおけるプロフィール画像のアップロード・配信システムの完全ガイド

## 📋 システム概要

### アーキテクチャ
```
ユーザー → Next.js → AWS S3 → CloudFront → 表示
         ↘️          ↗️
           Supabase DB
```

### 使用技術
- **フロントエンド**: Next.js (App Router)
- **認証**: Supabase Auth
- **データベース**: Supabase (PostgreSQL)
- **ストレージ**: AWS S3
- **CDN**: AWS CloudFront
- **画像配信**: CloudFront Distribution

---

## 🔄 プロフィール画像アップロードフロー

### 1. ユーザーが画像を選択
**場所**: `app/profile/edit/ProfileEditClient.tsx`
```tsx
const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file) {
    setProfileImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }
};
```

### 2. 保存ボタンをクリック
**場所**: `app/profile/edit/ProfileEditClient.tsx`
```tsx
const handleSave = async () => {
  // 画像アップロード処理
  if (profileImageFile) {
    updatedProfileImageUrl = await uploadImageToS3(profileImageFile);
  }

  // HonoAPIでプロフィール更新
  const updatedData = {
    username: formData.username,
    dojo_style_name: formData.dojo_style_name,
    training_start_date: formData.training_start_date,
    profile_image_url: updatedProfileImageUrl,
  };
};
```

### 3. S3アップロード用署名付きURL取得
**API**: `POST /api/upload-url`
**場所**: `app/api/upload-url/route.ts`

```typescript
// リクエスト
{
  "filename": "profile.jpg",
  "contentType": "image/jpeg",
  "fileSize": 512000
}

// レスポンス
{
  "uploadUrl": "https://aikinote-bucket.s3.ap-northeast-1.amazonaws.com/users/xxx/avatar-xxx.jpg?X-Amz-Algorithm=...",
  "fileKey": "users/d99f1835-c58b-4593-ac2b-10c2fca26b82/avatar-uuid.jpg",
  "expiresIn": 900
}
```

**処理内容**:
- Supabase認証確認
- ファイル形式検証（jpg/jpeg/png/webp）
- ファイルサイズ検証（1MB未満）
- 一意なファイルキー生成: `users/{userId}/avatar-{uuid}.{extension}`
- S3署名付きURL生成（15分有効）

### 4. S3に直接アップロード
**メソッド**: `PUT`
**URL**: 署名付きURL

```typescript
const uploadResponse = await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': file.type,
  },
  body: file,
});
```

**S3に保存される情報**:
- **バケット**: `aikinote-bucket`
- **パス**: `users/{userId}/avatar-{uuid}.{extension}`
- **タグ**: `public=true` （CloudFrontアクセス許可用）
- **メタデータ**:
  - `uploaded-by`: ユーザーID
  - `upload-type`: "profile-image"

### 5. データベース更新
**API**: `POST /api/profile-image`
**場所**: `app/api/profile-image/route.ts`

```typescript
// リクエスト
{
  "fileKey": "users/d99f1835-c58b-4593-ac2b-10c2fca26b82/avatar-uuid.jpg"
}

// レスポンス
{
  "success": true,
  "imageUrl": "https://d2zhlmel6ws1p9.cloudfront.net/users/xxx/avatar-xxx.jpg",
  "message": "プロフィール画像が正常に更新されました"
}
```

**処理内容**:
- Supabase認証確認
- ファイルキーの所有者確認（`users/{userId}/`で始まる）
- 古い画像がある場合、S3から削除
- CloudFrontのURLを生成
- Supabaseの`User`テーブルを更新

### 6. プロフィール情報更新
**API**: `PUT /api/users/{userId}` (Hono Backend)
**場所**: `backend/src/routes/users.ts`

```typescript
// リクエスト
{
  "username": "user123",
  "dojo_style_name": "蕨合気道会",
  "training_start_date": "2018年の冬頃",
  "profile_image_url": "https://d2zhlmel6ws1p9.cloudfront.net/users/xxx/avatar-xxx.jpg"
}
```

---

## 🏗️ AWS S3 & CloudFront設定

### S3バケット設定
**バケット名**: `aikinote-bucket`
**リージョン**: `ap-northeast-1`

### バケットポリシー
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyDirectPublicAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::aikinote-bucket/*",
      "Condition": {
        "StringNotEquals": {
          "s3:ExistingObjectTag/public": "true"
        }
      }
    },
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::aikinote-bucket/*",
      "Condition": {
        "ArnLike": {
          "AWS:SourceArn": "arn:aws:cloudfront::945098287150:distribution/E31XUQ0FPT7OCD"
        }
      }
    }
  ]
}
```

### アクセス制御の仕組み
1. **直接S3アクセス**: 拒否（プライベートバケット）
2. **CloudFrontアクセス**: `public=true`タグがある場合のみ許可
3. **プロフィール画像**: アップロード時に自動で`public=true`タグ付与

### CloudFront設定
**Distribution ID**: `E31XUQ0FPT7OCD`
**ドメイン**: `d2zhlmel6ws1p9.cloudfront.net`

---

## 🔐 セキュリティ仕様

### 認証・認可
- **アップロード**: Supabase認証必須
- **ファイル所有者確認**: `users/{userId}/`パスで制限
- **API アクセス**: JWT トークン認証

### ファイル制限
- **形式**: JPG, JPEG, PNG, WebP のみ
- **サイズ**: 1MB未満
- **命名**: UUID使用で重複防止

### URL生成
```typescript
// lib/aws-s3.ts
export function generatePublicUrl(fileKey: string): string {
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd2zhlmel6ws1p9.cloudfront.net'
  return `https://${cloudFrontDomain}/${fileKey}`
}
```

---

## 🎯 画像表示フロー

### AikiNote内での画像表示
1. **データベースからURL取得**: CloudFrontのURLが保存されている
2. **直接表示**: `<img src="cloudfront-url" />` で表示可能
3. **キャッシュ効果**: CloudFrontによる高速配信

### 表示URL例
```
https://d2zhlmel6ws1p9.cloudfront.net/users/d99f1835-c58b-4593-ac2b-10c2fca26b82/avatar-d0c098ea-bd24-4f57-8de8-9c23eb3ecd67.png
```

### アクセス条件
- ✅ **CloudFront経由**: 表示可能
- ❌ **直接S3**: 403 Forbidden
- ✅ **`public=true`タグ**: 必須
- ✅ **プロフィール画像**: 自動でタグ付与

---

## 🛠️ 実装ファイル一覧

### フロントエンド
```
frontend/
├── lib/aws-s3.ts                          # S3操作ユーティリティ
├── app/api/upload-url/route.ts             # 署名付きURL生成API
├── app/api/profile-image/route.ts          # プロフィール画像更新API
├── app/profile/edit/ProfileEditClient.tsx  # プロフィール編集画面
├── components/avatar.tsx                   # アバター表示コンポーネント
└── components/profile-image-upload.tsx     # 画像アップロードコンポーネント
```

### バックエンド
```
backend/
└── src/routes/users.ts                     # ユーザープロフィールAPI
```

### データベース
```
database/
└── migrations/add_profile_image_url.sql    # profile_image_urlカラム追加
```

---

## 🚨 トラブルシューティング

### 画像が表示されない場合
1. **S3タグ確認**: `public=true`タグが付いているか
2. **CloudFrontキャッシュ**: 無効化が必要な場合あり
3. **URL形式**: CloudFrontのURLを使用しているか

### よくあるエラー
- **403 Forbidden**: タグが未設定またはS3直接アクセス
- **401 Unauthorized**: 認証トークンの問題
- **400 Bad Request**: ファイル形式またはサイズの問題

### デバッグコマンド
```bash
# CloudFrontキャッシュ無効化
aws cloudfront create-invalidation \
  --distribution-id E31XUQ0FPT7OCD \
  --paths "/users/*/avatar-*"

# S3オブジェクトのタグ確認
aws s3api get-object-tagging \
  --bucket aikinote-bucket \
  --key "users/xxx/avatar-xxx.jpg"
```

---

## 📊 パフォーマンス

### CloudFront利点
- **グローバル配信**: エッジロケーション活用
- **キャッシュ効果**: 高速な画像配信
- **帯域幅節約**: S3転送コスト削減

### 想定コスト（月間）
- **S3ストレージ**: ~$0.50（10,000ユーザー、100KB/画像）
- **CloudFront**: ~$1.00（リクエスト料金）
- **データ転送**: ~$5.00
- **合計**: ~$6.50/月