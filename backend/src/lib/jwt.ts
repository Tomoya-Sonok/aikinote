import { sign, verify } from "hono/jwt";

export interface JWTPayload {
  userId: string;
  email?: string;
  iat?: number;
  exp?: number;
}

type JwtEnv =
  | {
      JWT_SECRET?: string;
    }
  | undefined;

const getSecret = (env?: JwtEnv): string => {
  const secret =
    env?.JWT_SECRET ??
    (typeof process !== "undefined" ? process.env?.JWT_SECRET : undefined);

  if (!secret) {
    const availableKeys = env ? Object.keys(env).join(", ") : "none";
    const hasProcess = typeof process !== "undefined";
    const processKeys =
      hasProcess && process.env ? Object.keys(process.env).join(", ") : "none";

    throw new Error(
      `JWT secret is not configured. (Available Env Keys: ${availableKeys}, Process Env Keys: ${processKeys})`,
    );
  }

  return secret;
};

export async function generateToken(
  payload: { userId: string; email?: string },
  env?: JwtEnv,
): Promise<string> {
  const secret = getSecret(env);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60 * 24;

  return sign(
    {
      ...payload,
      iat: now,
      exp,
    },
    secret,
  );
}

export async function verifyToken(
  token: string,
  env?: JwtEnv,
): Promise<JWTPayload> {
  const secret = getSecret(env);

  try {
    const result = await verify(token, secret);
    return result as unknown as JWTPayload;
  } catch (_error) {
    throw new Error("Invalid or expired token");
  }
}

export function extractTokenFromHeader(authHeader: string | undefined): string {
  if (!authHeader) {
    throw new Error("Authorization header missing");
  }

  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Invalid authorization format");
  }

  return authHeader.substring(7);
}
