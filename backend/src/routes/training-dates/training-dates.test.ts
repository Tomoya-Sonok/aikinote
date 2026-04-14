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

  it("year・month・user_id指定時に稽古日一覧とページ件数を返す", async () => {
    // Arrange
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

    // Act
    const response = await app.fetch(
      new Request("http://localhost/?user_id=user-1&year=2026&month=3"),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.training_dates).toHaveLength(1);
    expect(body.data.page_counts).toHaveLength(1);
  });

  it("PUTリクエストで稽古参加日をupsertし200を返す", async () => {
    // Arrange
    vi.spyOn(supabaseModule, "upsertTrainingDateAttendance").mockResolvedValue({
      id: "td-1",
      user_id: "user-1",
      training_date: "2026-03-05",
      is_attended: true,
      created_at: "2026-03-05T00:00:00.000Z",
    });

    // Act
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

    // Assert
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.training_date).toBe("2026-03-05");
  });

  it("DELETEリクエストでdeleteTrainingDateAttendanceが呼ばれ200を返す", async () => {
    // Arrange
    const deleteSpy = vi
      .spyOn(supabaseModule, "deleteTrainingDateAttendance")
      .mockResolvedValue();

    // Act
    const response = await app.fetch(
      new Request("http://localhost/?user_id=user-1&training_date=2026-03-05", {
        method: "DELETE",
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(deleteSpy).toHaveBeenCalledWith("user-1", "2026-03-05");
  });

  it("user_id未指定の場合に400を返す", async () => {
    // Arrange
    const request = new Request("http://localhost/?year=2026&month=3");

    // Act
    const response = await app.fetch(request);

    // Assert
    expect(response.status).toBe(400);
  });

  it("日付がYYYY-MM-DD形式でない場合に400を返す", async () => {
    // Arrange
    const request = new Request("http://localhost/", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: "user-1",
        training_date: "2026/03/05",
      }),
    });

    // Act
    const response = await app.fetch(request);

    // Assert
    expect(response.status).toBe(400);
  });

  it("DELETEでtraining_date未指定の場合に400を返す", async () => {
    // Arrange
    const request = new Request("http://localhost/?user_id=user-1", {
      method: "DELETE",
    });

    // Act
    const response = await app.fetch(request);

    // Assert
    expect(response.status).toBe(400);
  });

  it("GETで稽古日取得中にDBエラーが発生した場合500を返す", async () => {
    // Arrange
    vi.spyOn(supabaseModule, "getTrainingDatesByMonth").mockRejectedValue(
      new Error("DB接続エラー"),
    );

    // Act
    const response = await app.fetch(
      new Request("http://localhost/?user_id=user-1&year=2026&month=3"),
    );

    // Assert
    expect(response.status).toBe(500);
  });

  it("PUTでupsert中にDBエラーが発生した場合500を返す", async () => {
    // Arrange
    vi.spyOn(supabaseModule, "upsertTrainingDateAttendance").mockRejectedValue(
      new Error("DB接続エラー"),
    );

    // Act
    const response = await app.fetch(
      new Request("http://localhost/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "user-1",
          training_date: "2026-03-05",
        }),
      }),
    );

    // Assert
    expect(response.status).toBe(500);
  });
});
