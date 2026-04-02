"use client";

import { Purchases } from "@revenuecat/purchases-js";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "@/lib/i18n/routing";

const REVENUECAT_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY ?? "";

/**
 * 購入専用ページ
 * Stripe Elements のライフサイクルを他コンポーネントから完全に隔離する。
 * URL: /settings/subscription/checkout?pkg=<identifier>
 */
export default function CheckoutPage() {
  const { user, isInitializing } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pkgIdentifier = searchParams.get("pkg");
  const [status, setStatus] = useState<"loading" | "error" | "cancelled">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (isInitializing || !user?.id || !pkgIdentifier || started.current) {
      return;
    }
    started.current = true;

    const run = async () => {
      try {
        // 毎回フレッシュなインスタンスを作成
        const instance = Purchases.configure(REVENUECAT_API_KEY, user.id);

        // Offerings からパッケージを取得
        const offerings = await instance.getOfferings();
        const pkg = offerings?.current?.availablePackages?.find(
          (p) => p.identifier === pkgIdentifier,
        );

        if (!pkg) {
          setStatus("error");
          setErrorMessage("プランが見つかりませんでした");
          return;
        }

        // Stripe Checkout を表示（ここで Stripe Elements が DOM にマウントされる）
        const { customerInfo } = await instance.purchase({ rcPackage: pkg });

        // 購入成功 → サブスクリプション設定ページに戻る
        if (customerInfo) {
          router.push("/settings/subscription?success=1");
        }
      } catch (error: unknown) {
        const err = error as { userCancelled?: boolean; message?: string };
        if (err.userCancelled) {
          // ユーザーキャンセル → 戻る
          setStatus("cancelled");
          setTimeout(() => {
            window.history.back();
          }, 1000);
          return;
        }
        console.error("[Checkout] 購入エラー:", error);
        setStatus("error");
        setErrorMessage(err.message ?? "購入処理中にエラーが発生しました");
      }
    };

    run();
  }, [isInitializing, user?.id, pkgIdentifier, router]);

  if (status === "error") {
    return (
      <div style={styles.container}>
        <p style={styles.errorText}>{errorMessage}</p>
        <button
          type="button"
          style={styles.button}
          onClick={() => window.history.back()}
        >
          戻る
        </button>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div style={styles.container}>
        <p style={styles.text}>キャンセルしました。戻ります...</p>
      </div>
    );
  }

  // loading — RevenueCat/Stripe のオーバーレイが表示されるため、
  // 背景は最小限にする
  return <div style={styles.container} />;
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "24px",
    gap: "16px",
  },
  text: {
    fontSize: "14px",
    color: "#8b8178",
  },
  errorText: {
    fontSize: "14px",
    color: "#f12b2b",
  },
  button: {
    padding: "12px 32px",
    border: "2px solid #2c2c2c",
    borderRadius: "8px",
    background: "transparent",
    color: "#2c2c2c",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
