"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Loader } from "@/components/atoms/Loader";
import styles from "./page.module.css";

interface ConfirmEmailChangeProps {
  token?: string;
  locale: string;
}

type Status = "loading" | "success" | "error";

export function ConfirmEmailChange({ token, locale }: ConfirmEmailChangeProps) {
  const t = useTranslations();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(t("emailChange.tokenInvalid"));
      return;
    }

    const confirm = async () => {
      try {
        const response = await fetch(
          `/api/auth/confirm-email-change?token=${token}`,
          {
            method: "POST",
          },
        );
        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.success) {
          setStatus("error");
          setMessage(result?.error ?? t("emailChange.confirmFailed"));
          return;
        }

        setStatus("success");
        setMessage(result?.message ?? t("emailChange.confirmSuccess"));
      } catch (error) {
        console.error("confirm-email-change: リクエスト失敗", error);
        setStatus("error");
        setMessage(t("emailChange.confirmFailed"));
      }
    };

    void confirm();
  }, [token, t]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {status === "loading" ? (
          <Loader size="large" centered text={t("emailChange.confirming")} />
        ) : (
          <>
            <h1 className={styles.title}>{message}</h1>
            {status === "success" && (
              <p className={styles.note}>{t("emailChange.completeNote")}</p>
            )}
            <Link href={`/${locale}/login`} className={styles.linkButton}>
              {t("emailChange.backToLogin")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
