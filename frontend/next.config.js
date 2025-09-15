const path = require("node:path");

// dotenvが利用可能な場合のみ、ルートディレクトリの.env.localを読み込み
// Docker環境などではenv_fileで環境変数が既に設定されているため、dotenvは不要
try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
} catch (_error) {
  // dotenvが見つからない場合は無視（Docker環境など）
  console.log("dotenv not found, using existing environment variables");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLintをビルド時に無効化
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TypeScript型チェックをビルド時に無効化（一時的）
  typescript: {
    ignoreBuildErrors: true,
  },

  // SSGを完全に無効化し、すべてをSSRに変更
  output: "standalone",
  trailingSlash: false,

  // 実験的機能の設定
  experimental: {
    forceSwcTransforms: true,
    // プリレンダリングを完全に無効化
    ppr: false,
  },

  // フォント最適化の設定（Docker環境での問題を回避）
  optimizeFonts: true,

  // 外部ドメインからのフォント読み込みを許可
  images: {
    domains: ["fonts.googleapis.com", "fonts.gstatic.com"],
  },

  // webpack設定
  webpack: (config, { dev }) => {
    if (!dev) {
      // プロダクションビルド時はMSW関連ファイルを除外
      config.resolve.alias = {
        ...config.resolve.alias,
        "@/mocks/browser": false,
        "@/mocks/server": false,
        "@/mocks": false,
      };
    }
    return config;
  },

  // 環境変数を明示的に設定（ビルド時とランタイム両方で利用可能）
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_IS_DOCKER: process.env.NEXT_PUBLIC_IS_DOCKER,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
};

module.exports = nextConfig;
