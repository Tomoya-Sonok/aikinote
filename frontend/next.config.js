const path = require("node:path");
const createNextIntlPlugin = require("next-intl/plugin");

// dotenvが利用可能な場合のみ、ルートディレクトリの.env.localを読み込み
// Docker環境などではenv_fileで環境変数が既に設定されているため、dotenvは不要
if (!process.env.NEXT_PUBLIC_IS_DOCKER) {
  const dotenv = require("dotenv");
  const envPath = path.resolve(__dirname, "../.env.local");
  if (require("node:fs").existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript型チェックをビルド時に無効化（一時的）
  typescript: {
    ignoreBuildErrors: true,
  },

  // Cache Components モデルを有効化し、Suspense 境界 + use cache で
  // Partial Prerendering を取れるようにする (Next.js 16 で旧 experimental.ppr は廃止)
  cacheComponents: true,

  // Phosphor Icons 最適化
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "date-fns", "recharts"],
  },

  // SSGを完全に無効化し、すべてをSSRに変更
  output: "standalone",
  trailingSlash: false,

  // 外部画像ドメインの許可（CloudFront経由のS3画像 + Google OAuth プロフィール画像）
  images: {
    remotePatterns: [
      ...(process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN
        ? [
            {
              protocol: "https",
              hostname: process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN,
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    // _next/image 経由で配信する画像を対応ブラウザ向けに AVIF/WebP へ自動変換。
    // LP の巨大 PNG（2.7MB 等）も 50〜70% 程度転送量を削減できる
    formats: ["image/avif", "image/webp"],
    // SP 比率 90% を踏まえ、実機幅に近いブレークポイントを明示指定して srcset の無駄生成を抑える
    deviceSizes: [320, 375, 428, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 24, 32, 40, 48, 64, 96, 128, 256, 384],
  },

  // webpack設定
  webpack: (config) => {
    return config;
  },

  // Universal Links / App Links 用の .well-known ファイルを正しい Content-Type で配信
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
      {
        source: "/.well-known/assetlinks.json",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },

  // 環境変数を明示的に設定（ビルド時とランタイム両方で利用可能）
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_IS_DOCKER: process.env.NEXT_PUBLIC_IS_DOCKER,
    NEXT_SERVER_API_URL: process.env.NEXT_SERVER_API_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
};

module.exports = withNextIntl(nextConfig);
