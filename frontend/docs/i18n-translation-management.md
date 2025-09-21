# AikiNote 国際化・翻訳管理手順書

## 概要

このドキュメントでは、AikiNoteアプリケーションの国際化（i18n）実装と翻訳ファイルの管理手順について説明します。

## アーキテクチャ

### 使用ライブラリ

- **next-intl**: Next.js App Router向けの国際化ライブラリ
- **Zustand**: 言語設定の状態管理

### ディレクトリ構造

```
frontend/
├── app/
│   ├── [locale]/           # ロケール別ルーティング
│   │   ├── layout.tsx      # ロケール別レイアウト
│   │   ├── page.tsx        # ホームページ
│   │   └── settings/       # 設定ページ
│   │       ├── language/   # 言語設定
│   │       └── font-size/  # 文字サイズ設定
│   └── layout.tsx          # ルートレイアウト
├── messages/               # 翻訳ファイル
│   ├── ja.json            # 日本語翻訳
│   └── en.json            # 英語翻訳
├── lib/
│   ├── i18n.ts            # next-intl設定
│   └── i18n/
│       ├── config.ts      # 基本設定
│       ├── routing.ts     # ルーティング設定
│       └── request.ts     # リクエスト設定
├── stores/
│   └── languageStore.ts   # 言語設定Zustandストア
└── components/
    └── providers/
        └── LanguageProvider.tsx  # 言語プロバイダー
```

## 翻訳ファイル管理

### 翻訳ファイルの場所

翻訳ファイルは `frontend/messages/` ディレクトリに配置：
- `ja.json`: 日本語翻訳
- `en.json`: 英語翻訳

### 翻訳キーの命名規則

翻訳キーは機能ごとに名前空間で分類：

```json
{
  "common": {
    "save": "保存",
    "cancel": "キャンセル",
    "back": "戻る"
  },
  "language": {
    "title": "言語設定",
    "label": "言語 / Language",
    "saved": "言語設定を保存しました"
  },
  "fontSize": {
    "title": "文字サイズ設定",
    "small": "小",
    "medium": "中",
    "large": "大"
  }
}
```

### 新しい翻訳の追加手順

#### 1. 翻訳キーの設計

新しい機能を追加する際は、以下の手順で翻訳キーを設計：

1. **名前空間の決定**: 機能名や画面名を基準にした名前空間を決める
2. **キー構造の設計**: 階層構造を使って論理的にグループ化
3. **命名規則の統一**: 既存のキーと一貫性のある命名

例：ユーザープロフィール機能の場合
```json
{
  "profile": {
    "title": "プロフィール",
    "edit": "編集",
    "name": "名前",
    "email": "メールアドレス",
    "save": "保存する",
    "cancel": "キャンセル"
  }
}
```

#### 2. 翻訳ファイルの更新

##### ja.json（日本語）の更新
```bash
# frontend/messages/ja.json
{
  "existing": "既存の翻訳...",
  "profile": {
    "title": "プロフィール",
    "edit": "編集",
    "name": "名前",
    "email": "メールアドレス",
    "save": "保存する",
    "cancel": "キャンセル"
  }
}
```

##### en.json（英語）の更新
```bash
# frontend/messages/en.json
{
  "existing": "Existing translations...",
  "profile": {
    "title": "Profile",
    "edit": "Edit",
    "name": "Name",
    "email": "Email Address",
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

#### 3. コンポーネントでの使用

```tsx
import { useTranslations } from 'next-intl';

export function ProfileComponent() {
  const t = useTranslations('profile');

  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('edit')}</button>
      <input placeholder={t('name')} />
      <input placeholder={t('email')} />
      <button>{t('save')}</button>
      <button>{t('cancel')}</button>
    </div>
  );
}
```

### 翻訳ファイルの検証

#### 1. 構文チェック

JSONファイルの構文エラーをチェック：
```bash
# JSONファイルの構文確認
cat frontend/messages/ja.json | jq .
cat frontend/messages/en.json | jq .
```

#### 2. キーの整合性チェック

翻訳キーが両言語で一致しているかチェック：
```bash
# キー一覧の抽出と比較
jq -r 'paths(scalars) as $p | $p | join(".")' frontend/messages/ja.json | sort > ja_keys.txt
jq -r 'paths(scalars) as $p | $p | join(".")' frontend/messages/en.json | sort > en_keys.txt
diff ja_keys.txt en_keys.txt
```

#### 3. 未使用キーの検出

プロジェクト内で使用されていない翻訳キーを検出：
```bash
# 翻訳キーの使用状況チェック（例）
grep -r "t('profile" frontend/components/
```

## 新しい言語の追加

### 1. ロケール設定の更新

`frontend/lib/i18n/routing.ts` でサポート言語を追加：
```typescript
export const routing = defineRouting({
  locales: ['ja', 'en', 'ko'], // 韓国語を追加
  defaultLocale: 'ja',
  localePrefix: 'as-needed',
});
```

### 2. 翻訳ファイルの作成

新しい言語の翻訳ファイルを作成：
```bash
# 韓国語翻訳ファイルの作成
cp frontend/messages/en.json frontend/messages/ko.json
# その後、ko.jsonを韓国語に翻訳
```

### 3. 言語選択UIの更新

`frontend/stores/languageStore.ts` で言語選択肢を追加：
```typescript
export const getLanguageOptions = (): Array<{ value: Language; label: string }> => {
  return [
    { value: 'ja', label: '日本語' },
    { value: 'en', label: 'English' },
    { value: 'ko', label: '한국어' }, // 韓国語を追加
  ]
}
```

## 開発ワークフロー

### 1. 新機能開発時の手順

1. **翻訳キーの設計**: 機能仕様に基づいて必要な翻訳キーを設計
2. **翻訳ファイルの更新**: ja.json, en.jsonに翻訳を追加
3. **コンポーネント実装**: useTranslations()を使用して翻訳を適用
4. **動作確認**: 両言語での表示確認

### 2. 翻訳更新時の手順

1. **翻訳ファイルの修正**: messages/配下のJSONファイルを更新
2. **構文チェック**: JSONの構文エラーがないか確認
3. **動作確認**: ブラウザで表示確認
4. **コミット**: 翻訳ファイルの変更をコミット

### 3. レビューポイント

- [ ] 翻訳キーの命名が一貫している
- [ ] 両言語で同じキー構造になっている
- [ ] 翻訳内容が文脈に適している
- [ ] 未使用の翻訳キーが残っていない
- [ ] JSONファイルの構文が正しい

## ベストプラクティス

### 1. 翻訳キーの設計

- **明確で説明的な名前**: `btn1`より`saveButton`
- **階層構造の活用**: 機能ごとに名前空間を分ける
- **一貫性のある命名**: 既存のパターンに従う

### 2. 翻訳文の作成

- **文脈を考慮**: UIの文脈に適した翻訳
- **長さの考慮**: UIレイアウトに収まる長さ
- **文化的配慮**: 各言語圏の文化に配慮した表現

### 3. ファイル管理

- **定期的な整理**: 未使用キーの削除
- **バックアップ**: 重要な翻訳作業前のバックアップ
- **チーム共有**: 翻訳更新の共有とレビュー

## トラブルシューティング

### よくある問題と解決方法

#### 1. 翻訳が表示されない

**原因**: 翻訳キーが存在しない、または構文エラー
**解決方法**:
- 翻訳キーの存在確認
- JSONファイルの構文チェック
- ブラウザの開発者ツールでエラー確認

#### 2. 言語切り替えが機能しない

**原因**: ルーティング設定やミドルウェアの問題
**解決方法**:
- middleware.tsの設定確認
- ブラウザのネットワークタブでリクエスト確認
- LocalStorageの言語設定確認

#### 3. 一部の翻訳が古い言語で表示される

**原因**: キャッシュまたは翻訳キーの不整合
**解決方法**:
- ブラウザキャッシュのクリア
- 翻訳ファイルの整合性確認
- ハードリロード実行

## 今後の拡張

### 1. 翻訳管理システムの導入

- **Crowdin**, **Lokalise**等の翻訳管理プラットフォーム
- **自動化**: CI/CDでの翻訳ファイル同期

### 2. 高度な機能

- **複数形対応**: 数量に応じた翻訳
- **日時フォーマット**: ロケール固有の日時表示
- **通貨フォーマット**: 地域別通貨表示

### 3. パフォーマンス最適化

- **遅延読み込み**: 必要な翻訳のみ読み込み
- **CDN配信**: 翻訳ファイルのCDN配信
- **キャッシュ戦略**: 翻訳データの効率的キャッシュ