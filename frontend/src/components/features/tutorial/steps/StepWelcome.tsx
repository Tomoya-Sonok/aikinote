import { Chats, IdentificationCard, PencilSimple } from "@phosphor-icons/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { PillLabel } from "../PillLabel";
import styles from "../Tutorial.module.css";

export function StepWelcome() {
  const t = useTranslations("tutorial.welcome");

  return (
    <div className={styles.stepCenter}>
      <div className={`${styles.welcomeLogo} ${styles.fadeInUp1}`}>
        <Image
          src="/images/shared/aikinote_logo.png"
          alt="AikiNote"
          width={72}
          height={72}
        />
      </div>
      <h1 className={`${styles.headingLarge} ${styles.fadeInUp2}`}>
        {t("heading")}
      </h1>
      <div className={`${styles.divider} ${styles.fadeInUp3}`} />
      <p className={`${styles.catchphrase} ${styles.fadeInUp4}`}>
        {t("catchphrase")}
      </p>
      <p className={`${styles.welcomeDescription} ${styles.fadeInUp5}`}>
        {t("description")}
      </p>
      <div className={`${styles.pillRow} ${styles.fadeInUp6}`}>
        <PillLabel
          text={t("pillPersonal")}
          icon={<PencilSimple size={14} weight="light" />}
        />
        <PillLabel
          text={t("pillSocial")}
          icon={<Chats size={14} weight="light" />}
        />
        <PillLabel
          text={t("pillMypage")}
          icon={<IdentificationCard size={14} weight="light" />}
        />
      </div>
    </div>
  );
}
