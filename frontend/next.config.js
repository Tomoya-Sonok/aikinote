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

  // SSGを完全に無効化し、すべてをSSRに変更
  output: "standalone",
  trailingSlash: false,

  // webpack設定
  webpack: (config) => {
    return config;
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
