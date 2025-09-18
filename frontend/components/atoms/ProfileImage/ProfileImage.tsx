import Image from "next/image";
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
  alt = "プロフィール画像",
  size = "medium",
  className = "",
}) => {
  const imageSrc = src || "/mypage/assets/default-profile-image.svg";

  return (
    <div className={`${styles.container} ${styles[size]} ${className}`}>
      <Image
        src={imageSrc}
        alt={alt}
        fill
        className={styles.image}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
};
