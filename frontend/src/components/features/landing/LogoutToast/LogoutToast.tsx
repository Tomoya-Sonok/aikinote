"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/contexts/ToastContext";

export function LogoutToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const t = useTranslations("auth");
  const hasShownToast = useRef(false);
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 431px)");
    setIsWide(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const isLoggedOut = searchParams.get("logged_out");

    if (isLoggedOut === "true" && !hasShownToast.current) {
      hasShownToast.current = true;

      // !important を使わずメディアクエリをJSで制御する
      // 詳細: Toast.module.css のベーススタイルと詳細度が同じのため
      //       className では上書きできない → style prop（インライン）で解決
      const toastStyle: React.CSSProperties = isWide
        ? {} // PC幅: Toast.module.css の @media ルールに任せる
        : {
            right: "10px",
            maxWidth: "calc(100vw - 20px)",
            boxSizing: "border-box",
          };

      showToast(t("logoutSuccess"), "success", 3000, "", toastStyle);

      // URLからパラメータを削除（履歴に残さないようにreplaceを使用）
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("logged_out");
      router.replace(newUrl.pathname + newUrl.search + newUrl.hash, {
        scroll: false,
      });
    }
  }, [searchParams, router, showToast, t, isWide]);

  return null;
}
