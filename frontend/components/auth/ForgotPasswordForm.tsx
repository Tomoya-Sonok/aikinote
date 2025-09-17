"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  type ResetPasswordFormData,
  resetPasswordSchema,
} from "@/lib/utils/validation";

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
}

export function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { forgotPassword, loading, error, clearError } = useAuth();
  const emailId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const handleForgotPassword = async (data: ResetPasswordFormData) => {
    try {
      await forgotPassword(data);
      setIsSubmitted(true);
      onSuccess?.();
    } catch (err) {
      console.error("Forgot password error:", err);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="mb-4 text-green-600">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>メール送信完了</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            メール送信完了
          </h2>
          <p className="text-gray-600 mb-2">
            パスワードリセットメールを送信しました。
          </p>
          <p className="text-sm text-gray-500 mb-6">
            送信先: {getValues("email")}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            メールが届かない場合は、迷惑メールフォルダをご確認ください。
          </p>
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-center"
            >
              ログインページに戻る
            </Link>
            <button
              type="button"
              onClick={() => setIsSubmitted(false)}
              className="block w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
            >
              もう一度送信する
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        パスワードリセット
      </h2>
      <p className="text-center text-gray-600 mb-6">
        登録されたメールアドレスに、パスワードリセット用のリンクを送信します。
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(handleForgotPassword)} className="space-y-4">
        <div>
          <label
            htmlFor={emailId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            メールアドレス
          </label>
          <input
            {...register("email")}
            type="email"
            id={emailId}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="example@domain.com"
            onFocus={clearError}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "送信中..." : "リセットメールを送信"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          ログインページに戻る
        </Link>
      </div>
    </div>
  );
}
