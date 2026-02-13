"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Loader } from "@/components/atoms/Loader";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./Logout.module.css";

export function Logout() {
  const { signOutUser } = useAuth();
  const t = useTranslations();
  const isSigningOut = useRef(false);

  useEffect(() => {
    if (isSigningOut.current) return;
    isSigningOut.current = true;
    void signOutUser();
  }, [signOutUser]);

  return (
    <MinimalLayout showHeader={false}>
      <div className={styles.container}>
        <Loader size="large" centered text={t("auth.loading")} />
      </div>
    </MinimalLayout>
  );
}
