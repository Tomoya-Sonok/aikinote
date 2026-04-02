import { LockKey, LockKeyOpen } from "@phosphor-icons/react";
import type { FC } from "react";
import styles from "./PlanBadge.module.css";

interface PlanBadgeProps {
  isPremium: boolean;
}

export const PlanBadge: FC<PlanBadgeProps> = ({ isPremium }) => {
  return (
    <span className={isPremium ? styles.premium : styles.free}>
      {isPremium ? (
        <LockKeyOpen size={14} weight="bold" />
      ) : (
        <LockKey size={14} weight="bold" />
      )}
      {isPremium ? "Premium" : "Free"}
    </span>
  );
};
