import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseModule from "../../lib/supabase.js";
import trainingDatesRoute from "./index.js";

describe("稽古参加日API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/", trainingDatesRoute);
    vi.clearAllMocks();
  });

  it("月次データを取得できること", async () => {
    vi.spyOn(supabaseModule, "getTrainingDatesByMonth").mockResolvedValue([
      {
        id: "td-1",
        user_id: "user-1",
        training_date: "2026-03-01",
        is_attended: true,
        created_at: "2026-03-01T00:00:00.000Z",
      },
    ]);
    vi.spyOn(supabaseModule, "getTrainingPageCountsByMonth").mockResolvedValue([
      {
        training_date: "2026-03-01",
        page_count: 2,
      },
    ]);

    const response = await app.fetch(
      new Request("http://localhost/?user_id=user-1&year=2026&month=3"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.training_dates).toHaveLength(1);
    expect(body.data.page_counts).toHaveLength(1);
  });

  it("参加登録(upsert)できること", async () => {
    vi.spyOn(supabaseModule, "upsertTrainingDateAttendance").mockResolvedValue({
      id: "td-1",
      user_id: "user-1",
      training_date: "2026-03-05",
      is_attended: true,
      created_at: "2026-03-05T00:00:00.000Z",
    });

    const response = await app.fetch(
      new Request("http://localhost/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: "user-1",
          training_date: "2026-03-05",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.training_date).toBe("2026-03-05");
  });

  it("稽古参加を取り消し時にレコードを削除できること", async () => {
    const deleteSpy = vi
      .spyOn(supabaseModule, "deleteTrainingDateAttendance")
      .mockResolvedValue();

    const response = await app.fetch(
      new Request("http://localhost/?user_id=user-1&training_date=2026-03-05", {
        method: "DELETE",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(deleteSpy).toHaveBeenCalledWith("user-1", "2026-03-05");
  });

  it("必須クエリ欠落時にバリデーションエラーを返すこと", async () => {
    const response = await app.fetch(
      new Request("http://localhost/?year=2026&month=3"),
    );

    expect(response.status).toBe(400);
  });

  it("不正な日付フォーマットはバリデーションエラーを返すこと", async () => {
    const response = await app.fetch(
      new Request("http://localhost/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: "user-1",
          training_date: "2026/03/05",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
