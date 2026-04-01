import {
  ChatCircle,
  Heart,
  ShieldCheck,
  UsersThree,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { FeatureRow } from "../FeatureRow";
import { PillLabel } from "../PillLabel";
import styles from "../Tutorial.module.css";

export function StepMinnaDe() {
  const t = useTranslations("tutorial.minnaDe");

  return (
    <div className={styles.stepCenterNarrow}>
      <div className={`${styles.bigIconCircle} ${styles.fadeInUpA}`}>
        <UsersThree size={26} weight="light" />
      </div>
      <div className={`${styles.featureStepPill} ${styles.fadeInUpB}`}>
        <PillLabel text={t("pill")} />
      </div>
      <h2 className={`${styles.featureStepHeading} ${styles.fadeInUpD}`}>
        {t("heading")}
      </h2>
      <p className={`${styles.descriptionSpaced} ${styles.fadeInUpF}`}>
        {t("description")}
      </p>
      <div className={`${styles.featureRows} ${styles.fadeInUpH}`}>
        <FeatureRow
          icon={<ChatCircle size={16} weight="light" />}
          title={t("featurePostTitle")}
          sub={t("featurePostSub")}
        />
        <FeatureRow
          icon={<Heart size={16} weight="light" />}
          title={t("featureFavTitle")}
          sub={t("featureFavSub")}
        />
      </div>
      <div className={`${styles.safeDesignCard} ${styles.fadeInUpI}`}>
        <div className={styles.safeDesignHeader}>
          <ShieldCheck size={14} weight="light" color="var(--text-light)" />
          <p className={styles.safeDesignTitle}>{t("safeDesignTitle")}</p>
        </div>
        <p className={styles.safeDesignText}>
          {t("safeDesignLine1")}
          <br />
          {t("safeDesignLine2")}
          <br />
          {t("safeDesignLine3")}
        </p>
      </div>
    </div>
  );
}
