import { GearSix, User } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { FeatureRow } from "../FeatureRow";
import { PillLabel } from "../PillLabel";
import styles from "../Tutorial.module.css";

export function StepMyPage() {
  const t = useTranslations("tutorial.myPage");

  return (
    <div className={styles.stepCenterNarrow}>
      <div className={`${styles.bigIconCircle} ${styles.fadeInUpA}`}>
        <User size={26} weight="light" />
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
    </div>
  );
}
