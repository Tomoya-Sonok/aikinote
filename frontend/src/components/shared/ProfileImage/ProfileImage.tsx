import { UserCircleIcon } from "@phosphor-icons/react";
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
          unoptimized
          className={styles.image}
          sizes="(min-width: 1201px) 33vw, (min-width: 769px) 50vw, 100vw"
        />
      ) : (
        <UserCircleIcon
          size={120}
          weight="light"
          color="var(--aikinote-black)"
          className={styles.image}
        />
      )}
    </div>
  );
};
