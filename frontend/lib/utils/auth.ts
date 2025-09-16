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

export function generateUsernameFromEmail(email: string): string {
	return email.split("@")[0];
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

// トークンの有効期限（1時間）
export const TOKEN_EXPIRY_HOURS = 1;

export function isTokenExpired(createdAt: Date): boolean {
	const now = new Date();
	const expiryTime = new Date(
		createdAt.getTime() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
	);
	return now > expiryTime;
}
