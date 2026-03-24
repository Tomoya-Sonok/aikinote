import Image from "next/image";
import { getTranslations } from "next-intl/server";
import styles from "./Footer.module.css";

const CONTACT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfr11mzmwzwwXXULuoT4w8D57e9aAtUZa_9i8HDGAtDgjNxYw/viewform?usp=dialog";

const INSTAGRAM_URL = "https://www.instagram.com/aikinote_official/";
const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61585911578938";

interface FooterProps {
  locale: string;
}

export async function Footer({ locale }: FooterProps) {
  const t = await getTranslations({ locale, namespace: "landing.footer" });

  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.copyright}>
          © {currentYear} {t("brand")}
        </span>

        <div className={styles.separator} />

        <div className={styles.links}>
          <a
            href={CONTACT_FORM_URL}
            target="_blank"
            rel="noreferrer"
            className={styles.contactLink}
          >
            {t("contact")}
          </a>
          <div className={styles.socialIcons}>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noreferrer"
              className={styles.socialLink}
              aria-label={t("facebook")}
            >
              <Image
                src="/images/lp/facebook-logo.png"
                alt=""
                width={100}
                height={100}
                sizes="30px"
                className={styles.socialIcon}
              />
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className={styles.socialLink}
              aria-label={t("instagram")}
            >
              <Image
                src="/images/lp/instagram-logo.png"
                alt=""
                width={100}
                height={100}
                sizes="30px"
                className={styles.socialIcon}
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
