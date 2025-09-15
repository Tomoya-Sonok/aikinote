import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "認証エラー",
  description: "認証処理中にエラーが発生しました",
};

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams.error;

  const getErrorMessage = (errorCode?: string) => {
    switch (errorCode) {
      case "Configuration":
        return "認証設定に問題があります。管理者にお問い合わせください。";
      case "AccessDenied":
        return "アクセスが拒否されました。必要な権限がない可能性があります。";
      case "Verification":
        return "認証トークンが無効か期限切れです。";
      case "Default":
      default:
        return "認証処理中にエラーが発生しました。しばらくしてからもう一度お試しください。";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          サービス名
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <div className="mb-4 text-red-600">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L5.351 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              認証エラー
            </h2>
            <p className="text-gray-600 mb-6">{getErrorMessage(error)}</p>

            {error && (
              <div className="mb-6 p-3 bg-gray-100 rounded text-sm text-gray-500">
                エラーコード: {error}
              </div>
            )}

            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                ログインページに戻る
              </Link>
              <Link
                href="/signup"
                className="block w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                新規登録
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
