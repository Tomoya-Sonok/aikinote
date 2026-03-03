"use client";

import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserSession } from "@/lib/auth";
import { getClientSupabase } from "@/lib/supabase/client";
import { getRedirectUrl } from "@/lib/utils/env";
import { createUserProfile, fetchUserProfile } from "@/lib/utils/user";
import type {
  NewPasswordFormData,
  ResetPasswordFormData,
  SignInFormData,
  SignUpFormData,
} from "@/lib/utils/validation";

type SupabaseClient = ReturnType<typeof getClientSupabase>;
type SessionResponse = Awaited<
  ReturnType<SupabaseClient["auth"]["getSession"]>
>;
type SignOutResponse = Awaited<ReturnType<SupabaseClient["auth"]["signOut"]>>;

interface SignUpResponse {
  message: string;
  userId?: string;
}

export function useAuth() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitializingRef = useRef(true);
  const router = useRouter();
  const locale = useLocale();
  const supabase = useMemo(() => {
    return getClientSupabase();
  }, []);

  useEffect(() => {
    isInitializingRef.current = isInitializing;
  }, [isInitializing]);

  useEffect(() => {
    let isMounted = true;

    const supabaseClient = getClientSupabase();

    // 共通のユーザー取得関数を使用

    const fetchUserProfileWithRetry = async (
      userId: string,
      retries = 2,
      retryDelay = 200,
    ): Promise<UserSession | null> => {
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        const profile = await fetchUserProfile(userId);

        if (!isMounted) {
          return profile ?? null;
        }

        if (profile) {
          return profile;
        }

        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }

      return null;
    };

    const applySession = async (session: Session | null) => {
      if (!isMounted) return;

      if (session?.user) {
        const userProfile = await fetchUserProfileWithRetry(session.user.id);

        if (userProfile && isMounted) {
          setUser(userProfile);
          return;
        }
      }

      if (isMounted) {
        setUser(null);
      }
    };

    const initializeSession = async () => {
      isInitializingRef.current = true;
      setIsInitializing(true);
      try {
        // タイムアウト付きでセッション取得
        const sessionPromise: Promise<SessionResponse> =
          supabaseClient.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("セッション取得がタイムアウトしました")),
            10000,
          ),
        );

        const result = await Promise.race([sessionPromise, timeoutPromise]);
        const {
          data: { session },
          error,
        } = result;

        if (error) {
          console.error("セッション取得エラー:", error);
          setUser(null);
          return;
        }

        if (isMounted) {
          await applySession(session);
        }
      } catch (error) {
        console.error("セッション初期化中に予期せぬエラー:", error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          isInitializingRef.current = false;
          setIsInitializing(false);
        }
      }
    };

    void initializeSession();

    // セッション変更の監視を有効化（改善されたエラーハンドリング付き）
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      // 初期化中でない場合のみ処理
      if (!isInitializingRef.current && isMounted) {
        isInitializingRef.current = true;
        setIsInitializing(true);
        try {
          await applySession(session);
        } catch (error) {
          console.error("認証状態変更処理中にエラー:", error);
          if (isMounted) {
            setUser(null);
            // ネットワークエラー以外の場合はエラー状態を設定
            if (
              error instanceof Error &&
              !error.message.includes("ネットワーク")
            ) {
              setError("認証状態の更新中にエラーが発生しました");
            }
          }
        } finally {
          if (isMounted) {
            isInitializingRef.current = false;
            setIsInitializing(false);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(
    async (data: SignUpFormData): Promise<SignUpResponse> => {
      setIsProcessing(true);
      setError(null);

      try {
        const userResult = await createUserProfile({
          email: data.email,
          password: data.password,
          username: data.username,
        });

        if (!userResult.success) {
          throw new Error(userResult.error || "新規登録に失敗しました");
        }

        return {
          message:
            userResult.message ||
            "新規登録が完了しました。認証メールを確認してください。",
          userId: userResult.data?.id,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "新規登録に失敗しました";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  const signInWithCredentials = useCallback(
    async (data: SignInFormData) => {
      setIsProcessing(true);
      setError(null);

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) {
          throw new Error("メールアドレスまたはパスワードが正しくありません");
        }

        // セッション確立を待つ
        await new Promise((resolve) => setTimeout(resolve, 100));

        // ログイン成功後のリダイレクト
        router.push(`/${locale}/personal/pages`);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "ログインに失敗しました";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
    [supabase.auth, router, locale],
  );

  const signInWithGoogle = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getRedirectUrl("/auth/callback"),
        },
      });

      if (error) {
        throw new Error(error.message || "Googleログインに失敗しました");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Googleログインに失敗しました";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [supabase.auth]);

  const signOutUser = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // タイムアウト付きでSupabaseのサインアウトを実行
      const signOutPromise: Promise<SignOutResponse> = supabase.auth.signOut();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error("Supabaseサインアウトがタイムアウトしました（10秒）"),
            ),
          10000,
        ),
      );

      const { error } = await Promise.race([signOutPromise, timeoutPromise]);

      if (error) {
        console.error("signOutUser: Supabaseサインアウトエラー", error);
      }

      // エラーがあってもなくても、ローカル状態をクリアしてリダイレクト
      setUser(null);

      router.push("/?logged_out=true"); // ログアウト成功のトースト表示のためクエリパラメータを付与
    } catch (err) {
      console.warn(
        "signOutUser: Supabaseサインアウトでタイムアウト/エラーが発生しましたが、ローカルログアウトを実行します",
        err,
      );
      // エラーが発生してもユーザー状態をクリアしてリダイレクト
      setUser(null);
      router.push("/?logged_out=true"); // ログアウト成功のトースト表示のためクエリパラメータを付与
      // タイムアウトの場合は特にエラーとして扱わない
      if (err instanceof Error && err.message.includes("タイムアウト")) {
        // タイムアウトの場合は特にログ出力しない
      } else {
        const errorMessage =
          err instanceof Error ? err.message : "ログアウトに失敗しました";
        setError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [supabase.auth, router]);

  const forgotPassword = useCallback(async (data: ResetPasswordFormData) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "パスワードリセット要求に失敗しました");
      }

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "パスワードリセット要求に失敗しました";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const resetPassword = useCallback(
    async (token: string, data: NewPasswordFormData) => {
      setIsProcessing(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password: data.password,
            confirmPassword: data.confirmPassword,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "パスワードリセットに失敗しました");
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "パスワードリセットに失敗しました";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);

        if (userProfile) {
          setUser(userProfile);
          return userProfile;
        }
      }

      setUser(null);
      return null;
    } catch (error) {
      console.error("refreshUser: ユーザー情報の再取得エラー:", error);
      return null;
    }
  }, [supabase.auth]);

  const verifyEmail = useCallback(
    async (token: string) => {
      setIsProcessing(true);
      setError(null);

      try {
        const url = `/api/auth/verify-email?token=${token}`;

        const response = await fetch(url, {
          method: "POST",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "メール認証に失敗しました");
        }

        const emailOtp: string | null = result?.data?.emailOtp ?? null;
        const responseUser: UserSession | null = result?.data?.user ?? null;

        if (emailOtp && responseUser?.email) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            type: "magiclink",
            email: responseUser.email,
            token: emailOtp,
          });

          if (otpError) {
            console.error("verifyEmail: verifyOtpエラー", otpError);
            throw new Error("メール認証後の自動ログインに失敗しました");
          }

          await refreshUser();
        } else if (responseUser) {
          setUser(responseUser);
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "メール認証に失敗しました";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
    [supabase.auth, refreshUser],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    user,
    loading: isInitializing || isProcessing,
    isInitializing,
    isProcessing,
    error,
    signUp,
    signInWithCredentials,
    signInWithGoogle,
    signOutUser,
    forgotPassword,
    resetPassword,
    verifyEmail,
    refreshUser,
    clearError,
  };
}
