import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type Context, Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import {
	setSupabaseClient,
	supabase as supabaseFromModule,
} from "./lib/supabase.js";
import pagesRoute from "./routes/pages/index.js";
import tagsRoute from "./routes/tags/index.js";
import usersRoute from "./routes/users/index.js";

type AppBindings = {
	SUPABASE_URL?: string;
	SUPABASE_SERVICE_ROLE_KEY?: string;
	SUPABASE_ANON_KEY?: string;
	JWT_SECRET?: string;
	NEXT_PUBLIC_APP_URL?: string;
};

type AppVariables = {
	supabase: SupabaseClient | null;
};

type ResolveOptions = AppBindings & { preferAnon?: boolean };

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

let supabaseClient: SupabaseClient<any> | null = supabaseFromModule ?? null;
let hasLoggedAuthHeader = false;

const fetchGlobals =
	typeof fetch !== "undefined"
		? { fetch, Headers, Request, Response }
		: undefined;

const defaultAllowedOrigins = [
	"http://localhost:3000",
	"https://aikinote.com",
	"https://www.aikinote.com",
];

const normalizeOrigin = (origin: string): string => origin.replace(/\/+$/, "");

const getAllowedOrigins = (
	c: Context<{ Bindings: AppBindings; Variables: AppVariables }>,
): string[] => {
	const origins = new Set<string>();

	defaultAllowedOrigins.forEach((o) => origins.add(normalizeOrigin(o)));

	const envOrigins = [
		c.env?.NEXT_PUBLIC_APP_URL,
		getProcessEnv("NEXT_PUBLIC_APP_URL"),
	];

	envOrigins
		.filter((o): o is string => Boolean(o))
		.forEach((o) => origins.add(normalizeOrigin(o)));

	return Array.from(origins);
};

const getProcessEnv = (key: string): string | undefined => {
	return typeof process !== "undefined" ? process.env?.[key] : undefined;
};

const maybeLogAuthHeader = (path: string, authorization: string | null) => {
	if (hasLoggedAuthHeader) return;
	console.log("[auth-header]", {
		path,
		hasAuthorization: Boolean(authorization),
	});
	hasLoggedAuthHeader = true;
};

const resolveSupabaseClient = (
	bindings: ResolveOptions,
): SupabaseClient | null => {
	if (supabaseClient) {
		setSupabaseClient(supabaseClient);
		return supabaseClient;
	}

	const supabaseUrl = bindings.SUPABASE_URL ?? "";
	const supabaseKey = bindings.preferAnon
		? (bindings.SUPABASE_ANON_KEY ?? bindings.SUPABASE_SERVICE_ROLE_KEY ?? "")
		: (bindings.SUPABASE_SERVICE_ROLE_KEY ?? bindings.SUPABASE_ANON_KEY ?? "");

	if (!supabaseUrl || !supabaseKey) {
		return null;
	}

	supabaseClient = createClient(supabaseUrl, supabaseKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
		...(fetchGlobals ? { global: fetchGlobals } : {}),
	});
	setSupabaseClient(supabaseClient);

	return supabaseClient;
};

app.use(logger());
app.use(
	cors({
		origin: (origin, c) => {
			const allowedOrigins = getAllowedOrigins(c);
			if (!origin) {
				return allowedOrigins[0] ?? null;
			}

			const normalized = normalizeOrigin(origin);
			return allowedOrigins.includes(normalized) ? origin : null;
		},
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		exposeHeaders: ["Content-Length"],
		maxAge: 600,
		credentials: true,
	}),
);

app.use(async (c, next) => {
	maybeLogAuthHeader(c.req.path, c.req.header("Authorization") ?? null);

	const envVars = {
		SUPABASE_URL: c.env?.SUPABASE_URL ?? getProcessEnv("SUPABASE_URL"),
		SUPABASE_SERVICE_ROLE_KEY:
			c.env?.SUPABASE_SERVICE_ROLE_KEY ??
			getProcessEnv("SUPABASE_SERVICE_ROLE_KEY"),
		SUPABASE_ANON_KEY:
			c.env?.SUPABASE_ANON_KEY ?? getProcessEnv("SUPABASE_ANON_KEY"),
		JWT_SECRET: c.env?.JWT_SECRET ?? getProcessEnv("JWT_SECRET"),
	};

	const supabase = resolveSupabaseClient({
		...envVars,
		// バックエンドAPIは常にSERVICE_ROLE_KEYを使用（RLSをバイパスする必要があるため）
		preferAnon: false,
	});

	c.set("supabase", supabase);

	if (!supabase && c.req.path !== "/health") {
		const missing = Object.entries(envVars)
			.filter(([, v]) => !v)
			.map(([k]) => k);

		console.error(
			"[supabase] 環境変数が未設定のため Supabase クライアントを初期化できません:",
			{
				missing,
				resolved: Object.fromEntries(
					Object.entries(envVars).map(([k, v]) => [k, v ? "✅ set" : "❌ missing"]),
				),
			},
		);

		return c.json(
			{
				success: false,
				error: "Supabase環境変数が未設定です",
				missing,
			},
			500,
		);
	}

	return next();
});

// ヘルスチェックエンドポイント
app.get("/health", (c) => {
	return c.json({
		status: "ok",
		message: "AikiNote API Server is running!",
		timestamp: new Date().toISOString(),
	});
});

// APIルートを追加
app.route("/api/pages", pagesRoute);
app.route("/api/tags", tagsRoute);
app.route("/api/users", usersRoute);

export type AppType = typeof app;

export default app;
