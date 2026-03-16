"use client";

import {
  ImagesSquareIcon,
  TrashIcon as PhosphorTrashIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  type ChangeEvent,
  type FC,
  Fragment,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { ZodError } from "zod";
import type { UserProfile } from "@/components/features/personal/MyPageContent/MyPageContent";
import { Button } from "@/components/shared/Button/Button";
import {
  DojoStyleAutocomplete,
  type DojoStyleOption,
} from "@/components/shared/DojoStyleAutocomplete/DojoStyleAutocomplete";
import { Loader } from "@/components/shared/Loader/Loader";
import { PillSelect } from "@/components/shared/PillSelect/PillSelect";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import { SelectInput } from "@/components/shared/SelectInput/SelectInput";
import { TextArea } from "@/components/shared/TextArea/TextArea";
import { TextInput } from "@/components/shared/TextInput/TextInput";
import { useToast } from "@/contexts/ToastContext";
import {
  checkUsernameAvailability,
  createDojoStyle,
  getUserInfo,
  type UpdateUserInfoPayload,
  updateUserInfo,
} from "@/lib/api/client";
import { AIKIDO_RANK_OPTIONS } from "@/lib/constants/aikidoRank";
import { AGE_RANGE_OPTIONS, GENDER_OPTIONS } from "@/lib/constants/userProfile";
import { useAuth } from "@/lib/hooks/useAuth";
import { useProfileImageUpload } from "@/lib/hooks/useProfileImageUpload";
import { usernameSchema } from "@/lib/utils/validation";
import styles from "./ProfileEdit.module.css";

interface ProfileEditProps {
  user: UserProfile;
  from?: "social";
}

export const ProfileEdit: FC<ProfileEditProps> = ({
  user: initialUser,
  from,
}) => {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { showToast } = useToast();
  const { refreshUser } = useAuth();
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [loading, setLoading] = useState(true);
  const ageRangeGroupId = useId();
  const genderGroupId = useId();

  const [formData, setFormData] = useState({
    full_name: user.full_name || "",
    username: user.username,
    dojo_name: user.dojo_style_name || "",
    dojo_style_id: user.dojo_style_id || (null as string | null),
    aikido_rank: user.aikido_rank || "",
    profile_image_url: user.profile_image_url || "",
    bio: user.bio || "",
    age_range: user.age_range || "",
    gender: user.gender || "",
  });

  const {
    profileImageFile,
    previewUrl,
    handleImageChange,
    handleDeleteImage: handleDeleteImageHook,
    uploadImageToS3,
    cleanup: cleanupImagePreview,
  } = useProfileImageUpload();
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [dojoStyleError, setDojoStyleError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      usernameSchema.parse({ username: formData.username });
    } catch (error) {
      if (error instanceof ZodError) {
        setUsernameError(
          error.issues[0]?.message || t("userInfoEdit.invalidUsername"),
        );
        return;
      }
    }

    if (checkingUsername || usernameError) {
      return;
    }

    if (formData.dojo_name && !formData.dojo_style_id) {
      setDojoStyleError(t("userInfoEdit.dojoStyleNotRegistered"));
      return;
    }
    setDojoStyleError(null);

    try {
      let updatedProfileImageUrl = formData.profile_image_url;

      if (profileImageFile) {
        updatedProfileImageUrl = await uploadImageToS3(profileImageFile);
      }

      const updatedData = {
        userId: user.id,
        full_name: formData.full_name.trim() || null,
        username: formData.username,
        dojo_style_name: formData.dojo_name || null,
        dojo_style_id: formData.dojo_style_id,
        aikido_rank: formData.aikido_rank || null,
        profile_image_url: updatedProfileImageUrl || null,
        bio: formData.bio.trim() || null,
        age_range: (formData.age_range ||
          null) as UpdateUserInfoPayload["age_range"],
        gender: (formData.gender || null) as UpdateUserInfoPayload["gender"],
      };

      const result = await updateUserInfo(updatedData);
      if (!result.success) {
        const errorMsg = result.error || "";
        if (errorMsg.includes("既に使用されています")) {
          setUsernameError(t("userInfoEdit.usernameTaken"));
          return;
        }
        throw new Error(errorMsg || t("userInfoEdit.communicationFailed"));
      }

      await refreshUser();

      showToast(t("userInfoEdit.updateSuccess"), "success");

      if (from === "social") {
        router.push(`/${locale}/social/profile/${user.id}`);
      } else {
        router.push(`/${locale}/mypage`);
      }
    } catch (error) {
      console.error("プロフィール更新エラー:", error);
      showToast(
        error instanceof Error
          ? error.message
          : t("userInfoEdit.communicationFailed"),
        "error",
      );
    }
  };

  const handleCancel = () => {
    cleanupImagePreview();
    if (from === "social") {
      router.push(`/${locale}/social/profile/${user.id}`);
    } else {
      router.push(`/${locale}/mypage`);
    }
  };

  const fetchUserInfo = useCallback(async () => {
    try {
      const result = await getUserInfo(user.id);
      if (!result.success || !result.data) {
        const errorMessage =
          "error" in result
            ? result.error
            : t("userInfoEdit.profileFetchFailed");
        throw new Error(errorMessage);
      }

      const latestUser = result.data;

      setUser(latestUser);
      setFormData((prev) => ({
        ...prev,
        full_name: latestUser.full_name || "",
        username: latestUser.username,
        dojo_name: latestUser.dojo_style_name || "",
        dojo_style_id: latestUser.dojo_style_id || null,
        aikido_rank: latestUser.aikido_rank || "",
        profile_image_url: latestUser.profile_image_url || "",
        bio: latestUser.bio || "",
        age_range: latestUser.age_range || "",
        gender: latestUser.gender || "",
      }));
    } catch (error) {
      console.error("ユーザー情報取得エラー:", error);
      showToast(t("userInfoEdit.profileFetchFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, t, user.id]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const handleInputChange =
    (field: "full_name" | "username" | "profile_image_url") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      if (field === "username") {
        try {
          usernameSchema.parse({ username: value });
          setUsernameError(null);
        } catch (error) {
          if (error instanceof ZodError) {
            setUsernameError(
              error.issues[0]?.message || t("userInfoEdit.invalidUsername"),
            );
          }
        }
      }
    };

  const handleUsernameBlur = useCallback(async () => {
    const username = formData.username;

    if (usernameError) return;
    if (username === user.username) return;

    try {
      usernameSchema.parse({ username });
    } catch {
      return;
    }

    setCheckingUsername(true);
    try {
      const available = await checkUsernameAvailability(username, user.id);
      if (!available) {
        setUsernameError(t("userInfoEdit.usernameTaken"));
      }
    } finally {
      setCheckingUsername(false);
    }
  }, [formData.username, user.username, user.id, usernameError, t]);

  const handleDojoStyleSelect = (dojoStyle: DojoStyleOption) => {
    setFormData((prev) => ({
      ...prev,
      dojo_name: dojoStyle.dojo_name,
      dojo_style_id: dojoStyle.id,
    }));
    setDojoStyleError(null);
  };

  const handleRegisterNewDojo = async (query: string) => {
    try {
      const result = await createDojoStyle({
        dojo_name: query,
      });

      if (result.success && result.data) {
        setFormData((prev) => ({
          ...prev,
          dojo_name: result.data.dojo_name,
          dojo_style_id: result.data.id,
        }));
        setDojoStyleError(null);
        showToast(t("userInfoEdit.dojoRegistrationSuccess"), "success");
      }
    } catch (error) {
      console.error("道場登録エラー:", error);
      showToast(t("userInfoEdit.communicationFailed"), "error");
    }
  };

  const handleClearDojoStyle = () => {
    setFormData((prev) => ({
      ...prev,
      dojo_name: "",
      dojo_style_id: null,
    }));
  };

  const onImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    await handleImageChange(event, () => {
      showToast(t("userInfoEdit.communicationFailed"), "error");
    });
  };

  const handleDeleteImage = () => {
    handleDeleteImageHook();
    setFormData((prev) => ({ ...prev, profile_image_url: "" }));
  };

  const currentImageUrl = previewUrl || formData.profile_image_url;
  const canDeleteImage = !!profileImageFile || !!formData.profile_image_url;
  const uploadInstructionLines = t("userInfoEdit.uploadInstructions").split(
    "\n",
  );
  const lineOccurrences = new Map<string, number>();
  const uploadInstructionItems = uploadInstructionLines.map((line) => {
    const occurrence = lineOccurrences.get(line) ?? 0;
    lineOccurrences.set(line, occurrence + 1);
    return {
      line,
      key: occurrence > 0 ? `${line}-${occurrence}` : line,
    };
  });

  if (loading) {
    return (
      <div className={styles.content}>
        <Loader size="medium" centered text={t("userInfoEdit.loading")} />
      </div>
    );
  }

  return (
    <>
      <div className={styles.content}>
        {/* プロフィール画像 */}
        <div className={styles.imageSection}>
          <label className={styles.profileImageContainer}>
            <ProfileImage src={currentImageUrl} size="medium" />
            <div className={styles.editIcon}>
              <input
                type="file"
                accept="image/*"
                onChange={onImageChange}
                className={styles.fileInput}
              />
              <ImagesSquareIcon size={16} weight="light" color="var(--black)" />
            </div>
          </label>
          <div className={styles.imageUpload}>
            <p className={styles.uploadText}>
              {uploadInstructionItems.map(({ line, key }, index) => (
                <Fragment key={key}>
                  {index > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </p>
            <div className={styles.fileInfoContainer}>
              <p
                className={styles.fileInfo}
                style={{
                  color: profileImageFile
                    ? "var(--black)"
                    : "var(--text-light)",
                }}
              >
                {profileImageFile
                  ? profileImageFile.name
                  : t("userInfoEdit.noFileUploaded")}
              </p>
              {canDeleteImage && (
                <button
                  className={styles.deleteButton}
                  type="button"
                  onClick={handleDeleteImage}
                >
                  <PhosphorTrashIcon
                    size={16}
                    weight="light"
                    color="var(--black)"
                  />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          {/* ユーザー名 */}
          <TextInput
            label={t("userInfoEdit.username")}
            required
            value={formData.username}
            onChange={handleInputChange("username")}
            onBlur={handleUsernameBlur}
            placeholder={t("userInfoEdit.usernamePlaceholder")}
            maxLength={20}
            error={usernameError ?? undefined}
          />

          {/* 名前 */}
          <TextInput
            label={t("userInfoEdit.fullName")}
            value={formData.full_name}
            onChange={handleInputChange("full_name")}
            placeholder={t("userInfoEdit.fullNamePlaceholder")}
            maxLength={50}
          />

          {/* 所属道場名 */}
          <div className={styles.formGroup}>
            <span className={styles.label}>{t("userInfoEdit.dojoName")}</span>
            <DojoStyleAutocomplete
              value={formData.dojo_name}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, dojo_name: val }))
              }
              onSelect={handleDojoStyleSelect}
              onRegisterNew={handleRegisterNewDojo}
              placeholder={t("userInfoEdit.dojoNamePlaceholder")}
              selectedId={formData.dojo_style_id}
              onClear={handleClearDojoStyle}
            />
            {dojoStyleError && (
              <div className={styles.errorText}>{dojoStyleError}</div>
            )}
          </div>

          {/* 段級位 */}
          <SelectInput
            label={t("userInfoEdit.aikidoRank")}
            value={formData.aikido_rank}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                aikido_rank: e.target.value,
              }))
            }
          >
            <option value="">{t("userInfoEdit.aikidoRankPlaceholder")}</option>
            {AIKIDO_RANK_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </SelectInput>

          {/* 自己紹介 */}
          <TextArea
            label={t("userInfoEdit.bio")}
            value={formData.bio}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, bio: e.target.value }))
            }
            placeholder={t("userInfoEdit.bioPlaceholder")}
            rows={4}
            maxLength={500}
            showCharCount
          />

          {/* その他の情報 */}
          <div className={styles.divider} />
          <p className={styles.sectionSubtitle}>
            {t("userInfoEdit.otherInfo")}
          </p>

          {/* 年代 */}
          <div className={styles.formGroup}>
            <span className={styles.label} id={ageRangeGroupId}>
              {t("userInfoEdit.ageRange")}
            </span>
            <PillSelect
              options={AGE_RANGE_OPTIONS.map((value) => ({
                value,
                label: t(`userInfoEdit.ageRangeOptions.${value}`),
              }))}
              value={formData.age_range ?? null}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, age_range: value }))
              }
              groupLabelId={ageRangeGroupId}
            />
          </div>

          {/* 性別 */}
          <div className={styles.formGroup}>
            <span className={styles.label} id={genderGroupId}>
              {t("userInfoEdit.gender")}
            </span>
            <PillSelect
              options={GENDER_OPTIONS.map((value) => ({
                value,
                label: t(`userInfoEdit.genderOptions.${value}`),
              }))}
              value={formData.gender ?? null}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, gender: value }))
              }
              groupLabelId={genderGroupId}
            />
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="cancel" onClick={handleCancel}>
          {t("userInfoEdit.cancel")}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!!usernameError || checkingUsername}
        >
          {t("userInfoEdit.save")}
        </Button>
      </div>
    </>
  );
};
