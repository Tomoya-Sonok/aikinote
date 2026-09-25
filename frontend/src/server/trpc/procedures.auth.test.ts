/**
 * ユーザー所有データを扱う tRPC 手続きの認証テスト
 * 未ログインでは Hono API を呼ばずに UNAUTHORIZED になり、
 * ログイン時はバックエンド用 JWT を Authorization ヘッダーで渡すことを検証する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCallerFactory, type TRPCContext } from "./index";
import { appRouter } from "./router";

const mockGetVerifiedAuthUser = vi.fn();
const mockInitializeUserTagsIfNeeded = vi.fn();

vi.mock("@/lib/server/auth", () => ({
  createBackendAuthToken: vi.fn(),
  getVerifiedAuthUser: () => mockGetVerifiedAuthUser(),
}));

vi.mock("@/lib/server/tag", () => ({
  initializeUserTagsIfNeeded: (...args: unknown[]) =>
    mockInitializeUserTagsIfNeeded(...args),
}));

const createCaller = createCallerFactory(appRouter);

const buildCaller = (authToken: string | null) => {
  const ctx: TRPCContext = {
    req: new Request("http://localhost/api/trpc"),
    getAuthToken: async () => authToken,
  };
  return createCaller(ctx);
};

const mockFetch = vi.fn();

describe("ユーザー所有データの tRPC 手続き", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const cases: Array<{
    name: string;
    call: (caller: ReturnType<typeof buildCaller>) => Promise<unknown>;
  }> = [
    {
      name: "pages.getList",
      call: (c) => c.pages.getList({ userId: "user-1" }),
    },
    {
      name: "pages.getById",
      call: (c) => c.pages.getById({ pageId: "page-1", userId: "user-1" }),
    },
    {
      name: "pages.create",
      call: (c) => c.pages.create({ title: "稽古", user_id: "user-1" }),
    },
    {
      name: "pages.update",
      call: (c) =>
        c.pages.update({ id: "page-1", title: "稽古", user_id: "user-1" }),
    },
    {
      name: "pages.toggleVisibility",
      call: (c) =>
        c.pages.toggleVisibility({
          pageId: "page-1",
          user_id: "user-1",
          is_public: true,
        }),
    },
    {
      name: "pages.remove",
      call: (c) => c.pages.remove({ pageId: "page-1", userId: "user-1" }),
    },
    {
      name: "trainingDates.getMonth",
      call: (c) =>
        c.trainingDates.getMonth({ userId: "user-1", year: 2026, month: 9 }),
    },
    {
      name: "trainingDates.upsertAttendance",
      call: (c) =>
        c.trainingDates.upsertAttendance({
          userId: "user-1",
          trainingDate: "2026-09-25",
        }),
    },
    {
      name: "trainingDates.removeAttendance",
      call: (c) =>
        c.trainingDates.removeAttendance({
          userId: "user-1",
          trainingDate: "2026-09-25",
        }),
    },
    {
      name: "tags.getList",
      call: (c) => c.tags.getList({ userId: "user-1" }),
    },
    {
      name: "tags.create",
      call: (c) =>
        c.tags.create({
          name: "正面打ち",
          category: "waza",
          user_id: "user-1",
        }),
    },
    {
      name: "tags.remove",
      call: (c) => c.tags.remove({ tagId: "tag-1", userId: "user-1" }),
    },
    {
      name: "tags.updateOrder",
      call: (c) => c.tags.updateOrder({ user_id: "user-1", tori: [] }),
    },
    {
      name: "titleTemplates.getList",
      call: (c) => c.titleTemplates.getList({ userId: "user-1" }),
    },
    {
      name: "titleTemplates.create",
      call: (c) =>
        c.titleTemplates.create({ user_id: "user-1", template_text: "稽古" }),
    },
    {
      name: "titleTemplates.remove",
      call: (c) =>
        c.titleTemplates.remove({ templateId: "tpl-1", userId: "user-1" }),
    },
    {
      name: "categories.getList",
      call: (c) => c.categories.getList({ userId: "user-1" }),
    },
    {
      name: "categories.create",
      call: (c) => c.categories.create({ name: "武器", user_id: "user-1" }),
    },
    {
      name: "categories.update",
      call: (c) =>
        c.categories.update({
          categoryId: "cat-1",
          userId: "user-1",
          name: "武器",
        }),
    },
    {
      name: "categories.remove",
      call: (c) =>
        c.categories.remove({ categoryId: "cat-1", userId: "user-1" }),
    },
  ];

  it.each(cases)(
    "$name: 未ログインの場合、UNAUTHORIZED になり Hono API は呼ばれない",
    async ({ call }) => {
      // Arrange
      const caller = buildCaller(null);

      // Act
      const result = call(caller);

      // Assert
      await expect(result).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      expect(mockFetch).not.toHaveBeenCalled();
    },
  );

  it.each(cases)(
    "$name: ログイン時は Authorization ヘッダー付きで Hono API を呼ぶ",
    async ({ call }) => {
      // Arrange
      const caller = buildCaller("backend-token");

      // Act
      await call(caller);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.headers).toMatchObject({
        Authorization: "Bearer backend-token",
      });
    },
  );
});

describe("tags.initializeForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitializeUserTagsIfNeeded.mockResolvedValue({
      success: true,
      data: [],
    });
  });

  it("他人の userId を指定した場合、FORBIDDEN になり初期タグは作成されない", async () => {
    // Arrange
    mockGetVerifiedAuthUser.mockResolvedValue({ id: "user-1", email: "" });
    const caller = buildCaller("backend-token");

    // Act
    const result = caller.tags.initializeForUser({ userId: "other-user" });

    // Assert
    await expect(result).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mockInitializeUserTagsIfNeeded).not.toHaveBeenCalled();
  });

  it("本人の userId の場合、初期タグを作成する", async () => {
    // Arrange
    mockGetVerifiedAuthUser.mockResolvedValue({ id: "user-1", email: "" });
    const caller = buildCaller("backend-token");

    // Act
    const result = await caller.tags.initializeForUser({ userId: "user-1" });

    // Assert
    expect(result.success).toBe(true);
    expect(mockInitializeUserTagsIfNeeded).toHaveBeenCalledWith("user-1", "ja");
  });

  it("未ログインの場合、UNAUTHORIZED になる", async () => {
    // Arrange
    const caller = buildCaller(null);

    // Act
    const result = caller.tags.initializeForUser({ userId: "user-1" });

    // Assert
    await expect(result).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mockInitializeUserTagsIfNeeded).not.toHaveBeenCalled();
  });
});
