import Image from "next/image";
import type { FC } from "react";
import { useTranslations } from "next-intl";
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
  const imageSrc = src || "/mypage/assets/default-profile-image.svg";

  return (
    <div className={`${styles.container} ${styles[size]} ${className}`}>
      <Image
        src={imageSrc}
        alt={defaultAlt}
        fill
        unoptimized
        className={styles.image}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
};
