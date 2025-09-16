import { z } from "zod";

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

// ステップ1: メールアドレス・パスワード
export const emailPasswordSchema = z.object({
  email: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .regex(emailRegex, "メールアドレスの形式が正しくありません"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上である必要があります")
    .max(128, "パスワードは128文字以下である必要があります")
    .refine(passwordValidation, {
      message:
        "パスワードは大文字、小文字、数字、記号のうち3種類以上を含む必要があります",
    }),
});

// ステップ2: ユーザー名
export const usernameSchema = z.object({
  username: z
    .string()
    .min(1, "ユーザー名を入力してください")
    .max(50, "ユーザー名は50文字以下である必要があります")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます",
    ),
});

// 完全なサインアップスキーマ（API用）
export const signUpSchema = z.object({
  email: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .regex(emailRegex, "メールアドレスの形式が正しくありません"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上である必要があります")
    .max(128, "パスワードは128文字以下である必要があります")
    .refine(passwordValidation, {
      message:
        "パスワードは大文字、小文字、数字、記号のうち3種類以上を含む必要があります",
    }),
  username: z
    .string()
    .min(1, "ユーザー名を入力してください")
    .max(50, "ユーザー名は50文字以下である必要があります")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます",
    ),
});

export const signInSchema = z.object({
  email: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .regex(emailRegex, "メールアドレスの形式が正しくありません"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .regex(emailRegex, "メールアドレスの形式が正しくありません"),
});

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "パスワードは8文字以上である必要があります")
      .max(128, "パスワードは128文字以下である必要があります")
      .refine(passwordValidation, {
        message:
          "パスワードは大文字、小文字、数字、記号のうち3種類以上を含む必要があります",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

export type EmailPasswordFormData = z.infer<typeof emailPasswordSchema>;
export type UsernameFormData = z.infer<typeof usernameSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type NewPasswordFormData = z.infer<typeof newPasswordSchema>;
