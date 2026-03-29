import { UserIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import styles from "./ProfileImage.module.css";

interface ProfileImageProps {
  src?: string | null;
  alt?: string;
  size?: "small" | "medium" | "large";
  className?: string;
}

export const ProfileImage: FC<ProfileImageProps> = ({
  src,
  alt,
  size = "medium",
  className = "",
}) => {
  const t = useTranslations();
  const defaultAlt = alt || t("components.profileImage");

  return (
    <div className={`${styles.container} ${styles[size]} ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={defaultAlt}
          fill
          className={styles.image}
          sizes="120px"
        />
      ) : (
        <UserIcon
          size={120}
          weight="light"
          color="var(--black)"
          className={styles.image}
        />
      )}
    </div>
  );
};
