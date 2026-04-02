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
  priority?: boolean;
}

const SIZES_MAP = {
  small: "40px",
  medium: "60px",
  large: "120px",
} as const;

export const ProfileImage: FC<ProfileImageProps> = ({
  src,
  alt,
  size = "medium",
  className = "",
  priority = false,
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
          sizes={SIZES_MAP[size]}
          priority={priority}
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
