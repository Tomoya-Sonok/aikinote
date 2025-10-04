import { z } from "zod";

// Validation message helper function
type TranslationFunction = (key: string) => string;

// WHATWG標準のメールアドレス正規表現
const emailRegex =
  // /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:\.[a-zA-Z0-9])*$/;
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

// パスワード要件: 8〜128文字、4種のうち3種以上（大文字、小文字、数字、記号）
const passwordValidation = (password: string) => {
  if (password.length < 8 || password.length > 128) {
    return false;
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSymbols = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  const types = [hasUpperCase, hasLowerCase, hasNumbers, hasSymbols];
  const typeCount = types.filter(Boolean).length;

  return typeCount >= 3;
};

// Create validation schemas with i18n support
export const createEmailPasswordSchema = (t: TranslationFunction) =>
  z.object({
    email: z
      .string()
      .email(t("validation.invalidEmail"))
      .regex(emailRegex, t("validation.invalidEmailFormat")),
    password: z
      .string()
      .min(8, t("validation.passwordMinLength"))
      .max(128, t("validation.passwordMaxLength"))
      .refine(passwordValidation, {
        message: t("validation.passwordComplexity"),
      }),
  });

// Legacy schema for backward compatibility
export const emailPasswordSchema = createEmailPasswordSchema((key) => {
  // Default Japanese messages for legacy support
  const messages: Record<string, string> = {
    "validation.invalidEmail": "有効なメールアドレスを入力してください",
    "validation.invalidEmailFormat": "メールアドレスの形式が正しくありません",
    "validation.passwordMinLength": "パスワードは8文字以上である必要があります",
    "validation.passwordMaxLength":
      "パスワードは128文字以下である必要があります",
    "validation.passwordComplexity":
      "パスワードは大文字、小文字、数字、記号のうち3種類以上を含む必要があります",
  };
  return messages[key] || key;
});

// Username schema with i18n support
export const createUsernameSchema = (t: TranslationFunction) =>
  z.object({
    username: z
      .string()
      .min(1, t("validation.usernameRequired"))
      .max(20, t("validation.usernameMaxLength"))
      .regex(/^[a-zA-Z0-9_-]+$/, t("validation.usernameFormat")),
  });

// Legacy schema for backward compatibility
export const usernameSchema = createUsernameSchema((key) => {
  const messages: Record<string, string> = {
    "validation.usernameRequired": "ユーザー名を入力してください",
    "validation.usernameMaxLength":
      "ユーザー名は20文字以下である必要があります",
    "validation.usernameFormat":
      "ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます",
  };
  return messages[key] || key;
});

// Complete signup schema with i18n support
export const createSignUpSchema = (t: TranslationFunction) =>
  z.object({
    email: z
      .string()
      .email(t("validation.invalidEmail"))
      .regex(emailRegex, t("validation.invalidEmailFormat")),
    password: z
      .string()
      .min(8, t("validation.passwordMinLength"))
      .max(128, t("validation.passwordMaxLength"))
      .refine(passwordValidation, {
        message: t("validation.passwordComplexity"),
      }),
    username: z
      .string()
      .min(1, t("validation.usernameRequired"))
      .max(20, t("validation.usernameMaxLength"))
      .regex(/^[a-zA-Z0-9_-]+$/, t("validation.usernameFormat")),
  });

// Legacy schema
export const signUpSchema = createSignUpSchema((key) => {
  const messages: Record<string, string> = {
    "validation.invalidEmail": "有効なメールアドレスを入力してください",
    "validation.invalidEmailFormat": "メールアドレスの形式が正しくありません",
    "validation.passwordMinLength": "パスワードは8文字以上である必要があります",
    "validation.passwordMaxLength":
      "パスワードは128文字以下である必要があります",
    "validation.passwordComplexity":
      "パスワードは大文字、小文字、数字、記号のうち3種類以上を含む必要があります",
    "validation.usernameRequired": "ユーザー名を入力してください",
    "validation.usernameMaxLength":
      "ユーザー名は20文字以下である必要があります",
    "validation.usernameFormat":
      "ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます",
  };
  return messages[key] || key;
});

// Sign in schema with i18n support
export const createSignInSchema = (t: TranslationFunction) =>
  z.object({
    email: z
      .string()
      .email(t("validation.invalidEmail"))
      .regex(emailRegex, t("validation.invalidEmailFormat")),
    password: z.string().min(1, t("validation.passwordRequired")),
  });

// Legacy schema
export const signInSchema = createSignInSchema((key) => {
  const messages: Record<string, string> = {
    "validation.invalidEmail": "有効なメールアドレスを入力してください",
    "validation.invalidEmailFormat": "メールアドレスの形式が正しくありません",
    "validation.passwordRequired": "パスワードを入力してください",
  };
  return messages[key] || key;
});

// Reset password schema with i18n support
export const createResetPasswordSchema = (t: TranslationFunction) =>
  z.object({
    email: z
      .string()
      .email(t("validation.invalidEmail"))
      .regex(emailRegex, t("validation.invalidEmailFormat")),
  });

// Legacy schema
export const resetPasswordSchema = createResetPasswordSchema((key) => {
  const messages: Record<string, string> = {
    "validation.invalidEmail": "有効なメールアドレスを入力してください",
    "validation.invalidEmailFormat": "メールアドレスの形式が正しくありません",
  };
  return messages[key] || key;
});

// New password schema with i18n support
export const createNewPasswordSchema = (t: TranslationFunction) =>
  z
    .object({
      password: z
        .string()
        .min(8, t("validation.passwordMinLength"))
        .max(128, t("validation.passwordMaxLength"))
        .refine(passwordValidation, {
          message: t("validation.passwordComplexity"),
        }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation.passwordMismatch"),
      path: ["confirmPassword"],
    });

// Legacy schema
export const newPasswordSchema = createNewPasswordSchema((key) => {
  const messages: Record<string, string> = {
    "validation.passwordMinLength": "パスワードは8文字以上である必要があります",
    "validation.passwordMaxLength":
      "パスワードは128文字以下である必要があります",
    "validation.passwordComplexity":
      "パスワードは大文字、小文字、数字、記号のうち3種類以上を含む必要があります",
    "validation.passwordMismatch": "パスワードが一致しません",
  };
  return messages[key] || key;
});

export type EmailPasswordFormData = z.infer<typeof emailPasswordSchema>;
export type UsernameFormData = z.infer<typeof usernameSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type NewPasswordFormData = z.infer<typeof newPasswordSchema>;
