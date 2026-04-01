import {
  ArrowRight,
  ChatCircle,
  PencilSimple,
  User,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PillLabel } from "../PillLabel";
import styles from "../Tutorial.module.css";

interface StepCTAProps {
  onComplete: () => void;
}

export function StepCTA({ onComplete }: StepCTAProps) {
  const t = useTranslations("tutorial.cta");
  const router = useRouter();
  const locale = useLocale();

  const handleCTA = (path: string) => {
    onComplete();
    router.push(`/${locale}${path}`);
  };

  const handleLater = () => {
    onComplete();
  };

  const ctaItems = [
    {
      label: t("labelPersonal"),
      icon: <PencilSimple size={18} weight="light" color="var(--white)" />,
      text: t("writeRecord"),
      path: "/personal/pages/new",
    },
    {
      label: t("labelSocial"),
      icon: <ChatCircle size={18} weight="light" color="var(--white)" />,
      text: t("writePost"),
      path: "/social/posts/new",
    },
    {
      label: t("labelMypage"),
      icon: <User size={18} weight="light" color="var(--white)" />,
      text: t("editProfile"),
      path: "/profile/edit",
    },
  ];

  return (
    <div className={styles.stepCenterCTA}>
      <div className={`${styles.ctaLogo} ${styles.fadeInUpA}`}>
        <Image
          src="/images/shared/aikinote_logo.png"
          alt="AikiNote"
          width={52}
          height={52}
        />
      </div>
      <h2 className={`${styles.ctaHeading} ${styles.fadeInUpC}`}>
        {t("heading")}
      </h2>
      <p className={`${styles.ctaDescription} ${styles.fadeInUpE}`}>
        {t("description")}
      </p>
      <div className={`${styles.ctaButtons} ${styles.fadeInUpG}`}>
        {ctaItems.map((item) => (
          <div key={item.path} className={styles.ctaButtonWrapper}>
            <div className={styles.ctaButtonPill}>
              <PillLabel text={item.label} />
            </div>
            <button
              type="button"
              className={styles.ctaButton}
              onClick={() => handleCTA(item.path)}
            >
              {item.icon}
              <span className={styles.ctaButtonText}>{item.text}</span>
              <ArrowRight size={16} weight="bold" color="var(--white)" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={`${styles.laterButton} ${styles.fadeInUpI}`}
        onClick={handleLater}
      >
        {t("later")}
      </button>
    </div>
  );
}
