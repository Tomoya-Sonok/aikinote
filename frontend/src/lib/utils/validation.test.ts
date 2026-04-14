import { describe, expect, it } from "vitest";
import {
  emailPasswordSchema,
  newPasswordSchema,
  signUpSchema,
  usernameSchema,
} from "./validation";

describe("バリデーションスキーマ", () => {
  describe("メールアドレスバリデーション", () => {
    it("標準的なメールアドレスが通過する", () => {
      // Arrange
      const input = { email: "user@example.com", password: "Passw0rd!" };

      // Act
      const result = emailPasswordSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("サブドメイン付きメールアドレスが通過する", () => {
      // Arrange
      const input = { email: "user@mail.example.com", password: "Passw0rd!" };

      // Act
      const result = emailPasswordSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("@がないメールアドレスはエラーになる", () => {
      // Arrange
      const input = { email: "userexample.com", password: "Passw0rd!" };

      // Act
      const result = emailPasswordSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("ドメイン部分がないメールアドレスはエラーになる", () => {
      // Arrange
      const input = { email: "user@", password: "Passw0rd!" };

      // Act
      const result = emailPasswordSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("TLDがないメールアドレスはエラーになる", () => {
      // Arrange
      const input = { email: "user@example", password: "Passw0rd!" };

      // Act
      const result = emailPasswordSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe("パスワードバリデーション", () => {
    it("大文字・小文字・数字を含む8文字以上のパスワードが通過する", () => {
      // Arrange
      const input = { email: "user@example.com", password: "Passw0rd" };

      // Act
      const result = emailPasswordSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("大文字・小文字・記号を含むパスワードが通過する（数字なし3種類）", () => {
      // Arrange
      const input = { email: "user@example.com", password: "Password!" };

      // Act
      const result = emailPasswordSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("7文字のパスワードはエラーになる", () => {
      // Arrange
      const input = { email: "user@example.com", password: "Pass0r!" };

      // Act
      const result = emailPasswordSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("129文字のパスワードはエラーになる", () => {
      // Arrange
      const input = {
        email: "user@example.com",
        password: "A".repeat(126) + "a1!",
      };

      // Act
      const result = emailPasswordSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("小文字と数字のみ（2種類）のパスワードはエラーになる", () => {
      // Arrange
      const input = { email: "user@example.com", password: "password123" };

      // Act
      const result = emailPasswordSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("128文字ちょうどのパスワードが通過する（境界値）", () => {
      // Arrange: 大文字・小文字・数字の3種類を含む128文字
      const input = {
        email: "user@example.com",
        password: "A".repeat(125) + "a1!",
      };

      // Act
      const result = emailPasswordSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("8文字ちょうどのパスワードが通過する（境界値）", () => {
      // Arrange
      const input = { email: "user@example.com", password: "Abcde1!x" };

      // Act
      const result = emailPasswordSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe("ユーザー名バリデーション", () => {
    it("英数字のみのユーザー名が通過する", () => {
      // Arrange
      const input = { username: "user123" };

      // Act
      const result = usernameSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("アンダースコアとハイフンを含むユーザー名が通過する", () => {
      // Arrange
      const input = { username: "user_name-123" };

      // Act
      const result = usernameSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("日本語を含むユーザー名はエラーになる", () => {
      // Arrange
      const input = { username: "ユーザー名" };

      // Act
      const result = usernameSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("空文字のユーザー名はエラーになる", () => {
      // Arrange
      const input = { username: "" };

      // Act
      const result = usernameSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("21文字のユーザー名はエラーになる", () => {
      // Arrange
      const input = { username: "a".repeat(21) };

      // Act
      const result = usernameSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("20文字ちょうどのユーザー名が通過する（境界値）", () => {
      // Arrange
      const input = { username: "a".repeat(20) };

      // Act
      const result = usernameSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("スペースを含むユーザー名はエラーになる", () => {
      // Arrange
      const input = { username: "user name" };

      // Act
      const result = usernameSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe("新パスワードスキーマ（confirmPassword一致チェック）", () => {
    it("password と confirmPassword が一致する場合に通過する", () => {
      // Arrange
      const input = { password: "Passw0rd!", confirmPassword: "Passw0rd!" };

      // Act
      const result = newPasswordSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("password と confirmPassword が不一致の場合にエラーになる", () => {
      // Arrange
      const input = { password: "Passw0rd!", confirmPassword: "Different1!" };

      // Act
      const result = newPasswordSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        // エラーが confirmPassword フィールドに紐づく
        const paths = result.error.issues.map((i) => i.path.join("."));
        expect(paths).toContain("confirmPassword");
      }
    });
  });

  describe("サインアップスキーマ（複合バリデーション）", () => {
    it("有効なメール・パスワード・ユーザー名の組み合わせが通過する", () => {
      // Arrange
      const input = {
        email: "user@example.com",
        password: "Passw0rd!",
        username: "aikido_user",
      };

      // Act
      const result = signUpSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("いずれか1つでも無効な場合にエラーになる", () => {
      // Arrange: パスワードが2種類のみ（小文字+数字）
      const input = {
        email: "user@example.com",
        password: "password1",
        username: "valid_user",
      };

      // Act
      const result = signUpSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
