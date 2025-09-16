import { withAuth } from "next-auth/middleware";

export default withAuth(
	function middleware(_req) {
		// 認証が必要な場合の追加処理をここに記述
	},
	{
		callbacks: {
			authorized: ({ token, req }) => {
				// 認証が必要なパスの設定
				const { pathname } = req.nextUrl;

				// 認証ページは常にアクセス可能
				if (
					pathname.startsWith("/login") ||
					pathname.startsWith("/signup") ||
					pathname.startsWith("/forgot-password") ||
					pathname.startsWith("/reset-password") ||
					pathname.startsWith("/verify-email") ||
					pathname.startsWith("/error")
				) {
					return true;
				}

				// その他の保護されたルートは認証が必要
				return !!token;
			},
		},
	},
);

export const config = {
	// 認証チェックを行うパスを指定
	matcher: [
		// 認証ページを除く全てのパス
		"/((?!api|_next/static|_next/image|favicon.ico|login|signup|forgot-password|reset-password|verify-email|error).*)",
	],
};
