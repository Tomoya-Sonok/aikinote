"use client";

import { useState } from "react";
import { Skeleton } from "@/components/shared/Skeleton";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { PremiumUpgradeModal } from "../PremiumUpgradeModal/PremiumUpgradeModal";
import styles from "./SubscriptionGate.module.css";

interface SubscriptionGateProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  fallback?: React.ReactNode;
}

export function SubscriptionGate({
  children,
  title,
  description,
  fallback,
}: SubscriptionGateProps) {
  const { loading, isPremium } = useSubscription();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Skeleton
          variant="rect"
          width="100%"
          height="200px"
          borderRadius="8px"
        />
      </div>
    );
  }

  if (isPremium) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      <div className={styles.gateContainer}>
        <div className={styles.gateContent}>
          <p className={styles.gateTitle}>{title ?? "Premium 限定機能"}</p>
          <p className={styles.gateDescription}>
            {description ?? "この機能は Premium プランでご利用いただけます。"}
          </p>
          <button
            type="button"
            className={styles.upgradeButton}
            onClick={() => setShowModal(true)}
          >
            詳しく見る
          </button>
        </div>
      </div>
      <PremiumUpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
