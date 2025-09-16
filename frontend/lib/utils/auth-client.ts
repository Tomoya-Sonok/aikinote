export function generateUsernameFromEmail(email: string): string {
	return email.split("@")[0];
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