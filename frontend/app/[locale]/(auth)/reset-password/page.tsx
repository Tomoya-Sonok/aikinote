import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Loader } from "@/components/atoms/Loader";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { buildMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return buildMetadata({
    title: t("auth.newPasswordTitle"),
    description: t("auth.newPasswordDescription"),
  });
}

async function ResetPasswordContent({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;
  const t = await getTranslations();

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
              role="img"
              aria-label={t("auth.authErrorIcon")}
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
            {t("auth.invalidLink")}
          </h2>
          <p className="text-gray-600 mb-6">
            {t("auth.invalidTokenMessage")}
          </p>
          <a
            href="/forgot-password"
            className="inline-block w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-center"
          >
            {t("auth.retryPasswordReset")}
          </a>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {t("auth.serviceName")}
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t("auth.setNewPassword")}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense
          fallback={<Loader size="large" centered text={t("auth.loading")} />}
        >
          <ResetPasswordContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
