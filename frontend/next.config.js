const path = require("node:path");

// dotenvが利用可能な場合のみ、ルートディレクトリの.env.localを読み込み
// Docker環境などではenv_fileで環境変数が既に設定されているため、dotenvは不要
try {
	const dotenv = require("dotenv");
	dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
} catch (error) {
	// dotenvが見つからない場合は無視（Docker環境など）
	console.log("dotenv not found, using existing environment variables");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
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
