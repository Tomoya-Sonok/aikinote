"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { useToast } from "@/contexts/ToastContext";
import styles from "./LogoutToast.module.css";

export function LogoutToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const t = useTranslations("auth");
  const hasShownToast = useRef(false);

  useEffect(() => {
    const isLoggedOut = searchParams.get("logged_out");

    if (isLoggedOut === "true" && !hasShownToast.current) {
      hasShownToast.current = true;
      showToast(t("logoutSuccess"), "success", 3000, styles.logoutToast);

      // URLからパラメータを削除（履歴に残さないようにreplaceを使用）
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("logged_out");
      router.replace(newUrl.pathname + newUrl.search + newUrl.hash, {
        scroll: false,
      });
    }
  }, [searchParams, router, showToast, t]);

  return null;
}
