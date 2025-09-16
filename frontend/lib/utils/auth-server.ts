import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export function generateRandomUsername(prefix = "user"): string {
  const randomSuffix = randomBytes(4).toString("hex");
  return `${prefix}_${randomSuffix}`;
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

// Re-export client-safe utilities
export {
  generateUsernameFromEmail,
  isTokenExpired,
  TOKEN_EXPIRY_HOURS,
} from "./auth-client";
