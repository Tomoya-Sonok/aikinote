import { Chats, IdentificationCard, PencilSimple } from "@phosphor-icons/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AikinoteRightArrow } from "@/components/shared/Icons/AikinoteRightArrow";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";
import type { FontSize } from "@/stores/fontSizeStore";
import { PillLabel } from "../PillLabel";
import styles from "../Tutorial.module.css";

interface StepCTAProps {
  onComplete: () => void;
  fontSize: FontSize;
}

export function StepCTA({ onComplete, fontSize }: StepCTAProps) {
  const t = useTranslations("tutorial.cta");
  const router = useRouter();
  const locale = useLocale();
  const { track } = useUmamiTrack();

  const tutorialChangedFontSize = fontSize !== "medium";

  const handleCTA = (path: string, eventName: string) => {
    track(eventName, { tutorial_changed_font_size: tutorialChangedFontSize });
    onComplete();
    router.push(`/${locale}${path}`);
  };

  const handleLater = () => {
    track("tutorial_step6_dismiss", {
      tutorial_changed_font_size: tutorialChangedFontSize,
    });
    onComplete();
  };

  const ctaItems = [
    {
      label: t("labelPersonal"),
      pillIcon: <PencilSimple size={14} weight="light" />,
      text: t("writeRecord"),
      path: "/personal/pages/new",
      eventName: "tutorial_step6_cta_start_create_page",
    },
    {
      label: t("labelSocial"),
      pillIcon: <Chats size={14} weight="light" />,
      text: t("writePost"),
      path: "/social/posts/new?fromTutorial=1",
      eventName: "tutorial_step6_cta_start_create_post",
    },
    {
      label: t("labelMypage"),
      pillIcon: <IdentificationCard size={14} weight="light" />,
      text: t("editProfile"),
      path: "/profile/edit",
      eventName: "tutorial_step6_cta_start_update_profile",
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
              <PillLabel text={item.label} icon={item.pillIcon} />
            </div>
            <button
              type="button"
              className={styles.ctaButton}
              onClick={() => handleCTA(item.path, item.eventName)}
            >
              <span className={styles.ctaButtonText}>{item.text}</span>
              <AikinoteRightArrow size={16} color="var(--white)" />
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
