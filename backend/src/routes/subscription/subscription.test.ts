import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateToken } from "../../lib/jwt.js";
import subscriptionRoute from "./index.js";

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom } as unknown as SupabaseClient;
const mockIsPremiumUser = vi.fn();
const mockGetSubscriptionStatus = vi.fn();
const mockUpsertSubscriptionFromWebhook = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("../../lib/subscription.js", () => ({
  isPremiumUser: (...args: unknown[]) => mockIsPremiumUser(...args),
  getSubscriptionStatus: (...args: unknown[]) =>
    mockGetSubscriptionStatus(...args),
  upsertSubscriptionFromWebhook: (...args: unknown[]) =>
    mockUpsertSubscriptionFromWebhook(...args),
}));

// Stripe モック
const mockCheckoutSessionsCreate = vi.fn();
const mockCustomersList = vi.fn();
const mockCustomersCreate = vi.fn();
const mockSubscriptionsList = vi.fn();
const mockBillingPortalSessionsCreate = vi.fn();

vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: { create: mockCheckoutSessionsCreate },
      },
      customers: {
        list: mockCustomersList,
        create: mockCustomersCreate,
      },
      subscriptions: { list: mockSubscriptionsList },
      billingPortal: {
        sessions: { create: mockBillingPortalSessionsCreate },
      },
    })),
  };
});

vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
vi.stubEnv("JWT_SECRET", "test-jwt-secret");
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_xxx");

const TEST_ENV = { JWT_SECRET: "test-jwt-secret" };
const TEST_USER_ID = "test-user-id";

const createTestApp = () => {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("supabase" as never, mockSupabase);
    await next();
  });
  app.route("/api/subscription", subscriptionRoute);
  return app;
};

const createAuthHeaders = async () => {
  const token = await generateToken({ userId: TEST_USER_ID }, TEST_ENV);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

describe("Checkout Session作成 POST /api/subscription/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { email: "test@example.com" },
            error: null,
          }),
        }),
      }),
    });
  });

  it("既にPremiumの場合は409とALREADY_PREMIUMコードを返す", async () => {
    // Arrange
    mockIsPremiumUser.mockResolvedValue(true);
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/subscription/checkout", {
      method: "POST",
      headers,
      body: JSON.stringify({ priceId: "price_xxx" }),
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(409);
    expect(body.code).toBe("ALREADY_PREMIUM");
  });

  it("priceIdが未指定の場合は400を返す", async () => {
    // Arrange
    mockIsPremiumUser.mockResolvedValue(false);
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/subscription/checkout", {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("正常なCheckout Sessionが作成されURLが返る", async () => {
    // Arrange
    mockIsPremiumUser.mockResolvedValue(false);
    mockCustomersList.mockResolvedValue({ data: [] });
    mockCustomersCreate.mockResolvedValue({ id: "cus_new" });
    mockCheckoutSessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/xxx",
    });
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/subscription/checkout", {
      method: "POST",
      headers,
      body: JSON.stringify({ priceId: "price_xxx" }),
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.data.url).toBe("https://checkout.stripe.com/xxx");
  });
});

describe("同期 POST /api/subscription/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { email: "test@example.com" },
            error: null,
          }),
        }),
      }),
    });
  });

  it("Stripeに顧客がいない場合はDB値を信頼して返す", async () => {
    // Arrange
    mockCustomersList.mockResolvedValue({ data: [] });
    mockGetSubscriptionStatus.mockResolvedValue({
      tier: "free",
      status: "none",
    });
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/subscription/sync", {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.data.tier).toBe("free");
  });

  it("アクティブなサブスクリプションがない場合はFreeに戻す", async () => {
    // Arrange
    mockCustomersList.mockResolvedValue({
      data: [{ id: "cus_1" }],
    });
    mockSubscriptionsList.mockResolvedValue({ data: [] });
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/subscription/sync", {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.data.tier).toBe("free");
    expect(mockUpsertSubscriptionFromWebhook).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tier: "free", status: "expired" }),
    );
  });

  it("アクティブなサブスクリプションがある場合はPremiumに同期する", async () => {
    // Arrange
    mockCustomersList.mockResolvedValue({
      data: [{ id: "cus_1" }],
    });
    mockSubscriptionsList.mockResolvedValue({
      data: [
        {
          id: "sub_1",
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          cancel_at_period_end: false,
          items: { data: [{ price: { id: "price_xxx" } }] },
        },
      ],
    });
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/subscription/sync", {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.data.tier).toBe("premium");
    expect(mockUpsertSubscriptionFromWebhook).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tier: "premium", status: "active" }),
    );
  });
});
