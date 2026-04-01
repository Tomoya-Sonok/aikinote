import {
  EyeClosed,
  GearSix,
  IdentificationCard,
  User,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { FeatureRow } from "../FeatureRow";
import { PillLabel } from "../PillLabel";
import styles from "../Tutorial.module.css";

export function StepMyPage() {
  const t = useTranslations("tutorial.myPage");

  return (
    <div className={styles.stepCenterNarrow}>
      <div className={`${styles.featureStepPill} ${styles.fadeInUpA}`}>
        <PillLabel
          text={t("pill")}
          icon={<IdentificationCard size={14} weight="light" />}
        />
      </div>
      <h2 className={`${styles.featureStepHeading} ${styles.fadeInUpD}`}>
        {t("heading")}
      </h2>
      <p className={`${styles.descriptionSpaced} ${styles.fadeInUpF}`}>
        {t("description")}
      </p>
      <div className={`${styles.featureRows} ${styles.fadeInUpH}`}>
        <FeatureRow
          icon={<User size={16} weight="light" />}
          title={t("featureProfileTitle")}
          sub={t("featureProfileSub")}
        />
        <FeatureRow
          icon={<GearSix size={16} weight="light" />}
          title={t("featureSettingsTitle")}
          sub={t("featureSettingsSub")}
        />
      </div>
      <div className={`${styles.safeDesignCard} ${styles.fadeInUpI}`}>
        <div className={styles.safeDesignHeader}>
          <EyeClosed size={14} weight="light" color="var(--text-light)" />
          <p className={styles.safeDesignTitle}>{t("closedSpaceTitle")}</p>
        </div>
        <p className={styles.safeDesignText}>
          {t("closedSpaceLine1")}
          <br />
          {t("closedSpaceLine2")}
          <br />
          {t("closedSpaceLine3")}
        </p>
      </div>
    </div>
  );
}
