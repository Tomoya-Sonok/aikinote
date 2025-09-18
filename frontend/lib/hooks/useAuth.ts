"use client";

import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { UserSession } from "@/lib/auth";
import { getClientSupabase } from "@/lib/supabase/client";
import type {
  NewPasswordFormData,
  ResetPasswordFormData,
  SignInFormData,
  SignUpFormData,
} from "@/lib/utils/validation";

interface SignUpResponse {
  message: string;
  userId?: string;
}

export function useAuth() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => getClientSupabase(), []);

  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from("User")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("ユーザープロフィール取得エラー:", error);
        return null;
      }

      return data;
    };

    const applySession = async (session: Session | null) => {
      if (!isMounted) return;

      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);

        if (userProfile && isMounted) {
          setUser({
            id: session.user.id,
            email: userProfile.email,
            username: userProfile.username,
            profile_image_url: userProfile.profile_image_url,
          });
          return;
        }
      }

      if (isMounted) {
        setUser(null);
      }
    };

    const initializeSession = async () => {
      setIsInitializing(true);
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("セッション取得エラー:", error);
          setUser(null);
          return;
        }

        await applySession(session);
      } catch (error) {
        console.error("セッション初期化中に予期せぬエラー:", error);
        setUser(null);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    void initializeSession();

    // セッション変更の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsInitializing(true);
      try {
        await applySession(session);
      } catch (error) {
        console.error("認証状態変更処理中にエラー:", error);
        setUser(null);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signUp = async (data: SignUpFormData): Promise<SignUpResponse> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            dojo_id: data.dojoId || null,
          },
        },
      });

      if (error) {
        throw new Error(error.message || "新規登録に失敗しました");
      }

      if (authData?.user) {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: authData.user.id,
            email: data.email,
            username: data.username,
            dojo_id: data.dojoId || null,
          }),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => null);
          const message = result?.error || "ユーザー情報の初期化に失敗しました";
          throw new Error(message);
        }
      }

      return { message: "新規登録が完了しました", userId: authData?.user?.id };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "新規登録に失敗しました";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const signInWithCredentials = async (data: SignInFormData) => {
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
      router.push("/personal/pages");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "ログインに失敗しました";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/personal/pages`,
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
  };

  const signOutUser = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new Error(error.message || "ログアウトに失敗しました");
      }

      router.push("/login");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "ログアウトに失敗しました";
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const forgotPassword = async (data: ResetPasswordFormData) => {
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
  };

  const resetPassword = async (token: string, data: NewPasswordFormData) => {
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
        err instanceof Error ? err.message : "パスワードリセットに失敗しました";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyEmail = async (token: string) => {
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

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "メール認証に失敗しました";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

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
    clearError: () => setError(null),
  };
}
