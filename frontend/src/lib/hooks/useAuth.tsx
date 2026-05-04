"use client";

import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useToast } from "@/contexts/ToastContext";
import type { UserSession } from "@/lib/auth";
import { getClientSupabase } from "@/lib/supabase/client";
import { getRedirectUrl } from "@/lib/utils/env";
import {
  clearReturnToCookie,
  getReturnToFromSession,
} from "@/lib/utils/returnTo";
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

interface AuthContextValue {
  user: UserSession | null;
  loading: boolean;
  isInitializing: boolean;
  isProcessing: boolean;
  error: string | null;
  signUp: (data: SignUpFormData) => Promise<SignUpResponse>;
  signInWithCredentials: (data: SignInFormData) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOutUser: () => Promise<void>;
  forgotPassword: (data: ResetPasswordFormData) => Promise<unknown>;
  resetPassword: (token: string, data: NewPasswordFormData) => Promise<unknown>;
  verifyEmail: (token: string) => Promise<unknown>;
  refreshUser: () => Promise<UserSession | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 認証状態を単一インスタンスで保持するプロバイダ。
 * 以前は `useAuth()` を呼ぶ度に各コンポーネントが独立して
 * `supabase.auth.getSession()` → `fetchUserProfile()` → `getUserInfo` API を走らせていた。
 * authenticated ルートでは 30 以上の箇所で useAuth を呼んでおり、
 * 本番では Cloudflare Workers / Supabase の順序待ちで最大 20 秒以上の遅延が発生していた。
 * Provider で状態を一元化することで、tRPC の `users.getUserInfo` は画面ロード時に 1 回だけ走る。
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitializingRef = useRef(true);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("auth");
  const { showToast } = useToast();
  const supabase = useMemo(() => {
    return getClientSupabase();
  }, []);

  useEffect(() => {
    isInitializingRef.current = isInitializing;
  }, [isInitializing]);

  useEffect(() => {
    let isMounted = true;

    const supabaseClient = supabase;

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
        // 不安定なネットワーク下での「開かない」体感を避けるため、3 秒で打ち切り、
        // タイムアウト時は未ログイン扱いで UI を先に出す（onAuthStateChange が後追いで復帰させる）
        const sessionPromise: Promise<SessionResponse> =
          supabaseClient.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("セッション取得がタイムアウトしました")),
            3000,
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
  }, [supabase]);

  // ネイティブアプリにユーザー情報を通知（認証状態変化時）
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window as any).__AIKINOTE_NATIVE_APP__ &&
      (window as any).ReactNativeWebView
    ) {
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "USER_INFO",
          payload: {
            profileImageUrl: user?.profile_image_url ?? null,
            userId: user?.id ?? null,
          },
        }),
      );
    }
  }, [user]);

  const signUp = useCallback(
    async (data: SignUpFormData): Promise<SignUpResponse> => {
      setIsProcessing(true);
      setError(null);

      try {
        const userResult = await createUserProfile({
          email: data.email,
          password: data.password,
          username: data.username,
          language: locale as "ja" | "en",
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
    [locale],
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

        // ログイン成功後のリダイレクト（returnTo があれば元のページへ）
        const returnTo = getReturnToFromSession();
        clearReturnToCookie();
        router.push(returnTo || `/${locale}/personal/pages`);
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
    // ネイティブアプリの場合はブリッジに委譲し、結果を待つ
    const nativeBridge = window as unknown as {
      __AIKINOTE_NATIVE_APP__?: boolean;
      startNativeOAuth?: (
        provider: "google" | "apple",
      ) => Promise<{ success: boolean; reason?: string; message?: string }>;
    };
    if (
      typeof window !== "undefined" &&
      nativeBridge.__AIKINOTE_NATIVE_APP__ &&
      typeof nativeBridge.startNativeOAuth === "function"
    ) {
      setIsProcessing(true);
      setError(null);
      try {
        const result = await nativeBridge.startNativeOAuth("google");
        if (!result?.success) {
          const reason = result?.reason ?? "unknown";
          const message =
            reason === "cancel" || reason === "dismiss"
              ? "Googleログインがキャンセルされました"
              : "Googleログインに失敗しました。もう一度お試しください。";
          setError(message);
          throw new Error(message);
        }
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getRedirectUrl("/auth/callback"),
          // 既存の Google セッションでサイレント認証されないよう、毎回アカウント選択を強制
          queryParams: { prompt: "select_account" },
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

  const signInWithApple = useCallback(async () => {
    // ネイティブアプリの場合はブリッジに委譲し、結果を待つ
    const nativeBridge = window as unknown as {
      __AIKINOTE_NATIVE_APP__?: boolean;
      startNativeOAuth?: (
        provider: "google" | "apple",
      ) => Promise<{ success: boolean; reason?: string; message?: string }>;
    };
    if (
      typeof window !== "undefined" &&
      nativeBridge.__AIKINOTE_NATIVE_APP__ &&
      typeof nativeBridge.startNativeOAuth === "function"
    ) {
      setIsProcessing(true);
      setError(null);
      try {
        const result = await nativeBridge.startNativeOAuth("apple");
        if (!result?.success) {
          const reason = result?.reason ?? "unknown";
          const message =
            reason === "cancel" || reason === "dismiss"
              ? "Appleログインがキャンセルされました"
              : "Appleログインに失敗しました。もう一度お試しください。";
          setError(message);
          throw new Error(message);
        }
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: getRedirectUrl("/auth/callback"),
          // 既存の Apple セッションでサイレント認証されないよう、毎回アカウント選択を強制
          queryParams: { prompt: "select_account" },
        },
      });

      if (error) {
        throw new Error(error.message || "Appleログインに失敗しました");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Appleログインに失敗しました";
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

      // PC幅・SP幅に応じて適切に表示されるように Toast にスタイルを渡す
      const isWide = window.matchMedia("(min-width: 431px)").matches;
      const toastStyle: React.CSSProperties = isWide
        ? {}
        : {
            right: "10px",
            maxWidth: "calc(100vw - 20px)",
            boxSizing: "border-box",
          };

      showToast(t("logoutSuccess"), "success", 3000, "", toastStyle);
      router.push("/");
    } catch (err) {
      console.warn(
        "signOutUser: Supabaseサインアウトでタイムアウト/エラーが発生しましたが、ローカルログアウトを実行します",
        err,
      );
      // エラーが発生してもユーザー状態をクリアしてリダイレクト
      setUser(null);
      const isWide = window.matchMedia("(min-width: 431px)").matches;
      const toastStyle: React.CSSProperties = isWide
        ? {}
        : {
            right: "10px",
            maxWidth: "calc(100vw - 20px)",
            boxSizing: "border-box",
          };
      showToast(t("logoutSuccess"), "success", 3000, "", toastStyle);
      router.push("/");
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
  }, [supabase.auth, router, showToast, t]);

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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading: isInitializing || isProcessing,
      isInitializing,
      isProcessing,
      error,
      signUp,
      signInWithCredentials,
      signInWithGoogle,
      signInWithApple,
      signOutUser,
      forgotPassword,
      resetPassword,
      verifyEmail,
      refreshUser,
      clearError,
    }),
    [
      user,
      isInitializing,
      isProcessing,
      error,
      signUp,
      signInWithCredentials,
      signInWithGoogle,
      signInWithApple,
      signOutUser,
      forgotPassword,
      resetPassword,
      verifyEmail,
      refreshUser,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      "useAuth は <AuthProvider> 配下で呼び出してください。`app/[locale]/layout.tsx` で Provider を登録済みのはずです。",
    );
  }
  return ctx;
}
