"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader } from "@/components/atoms/Loader";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./LogoutClient.module.css";

export function LogoutClient() {
  const { signOutUser } = useAuth();
  const t = useTranslations();

  useEffect(() => {
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
