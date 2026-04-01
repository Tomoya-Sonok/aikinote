import {
  CalendarBlank,
  ChartBar,
  MagnifyingGlass,
  PencilSimple,
  Tag,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { FeatureRow } from "../FeatureRow";
import { PillLabel } from "../PillLabel";
import styles from "../Tutorial.module.css";

export function StepHitoride() {
  const t = useTranslations("tutorial.hitoride");

  return (
    <div className={styles.stepCenterNarrow}>
      <div className={`${styles.bigIconCircle} ${styles.fadeInUpA}`}>
        <PencilSimple size={26} weight="light" />
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
          icon={<Tag size={16} weight="light" />}
          title={t("featureTagTitle")}
          sub={t("featureTagSub")}
        />
        <FeatureRow
          icon={<PencilSimple size={16} weight="light" />}
          title={t("featureMemoTitle")}
          sub={t("featureMemoSub")}
        />
        <FeatureRow
          icon={<MagnifyingGlass size={16} weight="light" />}
          title={t("featureSearchTitle")}
          sub={t("featureSearchSub")}
        />
      </div>
      <div className={`${styles.badgeRow} ${styles.fadeInUpI}`}>
        <div className={styles.badge}>
          <CalendarBlank size={14} weight="light" color="var(--light-gray)" />
          <span className={styles.badgeText}>{t("badgeCalendar")}</span>
        </div>
        <div className={styles.badge}>
          <ChartBar size={14} weight="light" color="var(--light-gray)" />
          <span className={styles.badgeText}>{t("badgeStats")}</span>
        </div>
      </div>
    </div>
  );
}
