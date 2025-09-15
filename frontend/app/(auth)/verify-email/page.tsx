import { Metadata } from "next";
import { Suspense } from "react";
import { EmailVerificationForm } from "@/components/auth/EmailVerificationForm";

export const metadata: Metadata = {
  title: "メール認証",
  description: "メールアドレスの認証を完了してアカウントを有効化します",
};

function EmailVerificationContent({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  if (!token) {
    return (
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
            無効なリンク
          </h2>
          <p className="text-gray-600 mb-6">
            認証トークンが見つかりません。有効な認証リンクをご利用ください。
          </p>
          <a
            href="/signup"
            className="inline-block w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-center"
          >
            新規登録をやり直す
          </a>
        </div>
      </div>
    );
  }

  return <EmailVerificationForm token={token} />;
}

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          サービス名
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          メールアドレスの認証を行います
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div>読み込み中...</div>}>
          <EmailVerificationContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
