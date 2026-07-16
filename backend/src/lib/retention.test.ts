import { describe, expect, it } from "vitest";
import { selectRetentionTargets } from "./retention.js";

describe("selectRetentionTargets", () => {
  it("7日以内に利用のあるユーザー（activeUserIds）は除外される", () => {
    // Arrange: user-a は別デバイスで7日以内に利用がある
    const staleTokens = [
      {
        user_id: "user-a",
        expo_push_token: "token-a1",
        updated_at: "2026-07-01T00:00:00+00:00",
      },
      {
        user_id: "user-b",
        expo_push_token: "token-b1",
        updated_at: "2026-07-01T00:00:00+00:00",
      },
    ];
    const activeUserIds = new Set(["user-a"]);

    // Act
    const targets = selectRetentionTargets(
      staleTokens,
      activeUserIds,
      new Map(),
    );

    // Assert
    expect(targets).toEqual([{ userId: "user-b", tokens: ["token-b1"] }]);
  });

  it("未通知の離脱ユーザーは対象になり、複数トークンが1ユーザーにまとめられる", () => {
    // Arrange: user-a は iOS / Android の2デバイスを持つ
    const staleTokens = [
      {
        user_id: "user-a",
        expo_push_token: "token-a1",
        updated_at: "2026-07-01T00:00:00+00:00",
      },
      {
        user_id: "user-a",
        expo_push_token: "token-a2",
        updated_at: "2026-06-01T00:00:00+00:00",
      },
    ];

    // Act
    const targets = selectRetentionTargets(staleTokens, new Set(), new Map());

    // Assert
    expect(targets).toEqual([
      { userId: "user-a", tokens: ["token-a1", "token-a2"] },
    ]);
  });

  it("この離脱期間に送信済み（notified_at が最終利用以降）のユーザーは除外される", () => {
    // Arrange: 最終利用 7/1 → 通知済み 7/9（まだ再訪していない）
    const staleTokens = [
      {
        user_id: "user-a",
        expo_push_token: "token-a1",
        updated_at: "2026-07-01T00:00:00+00:00",
      },
    ];
    const notifiedAtByUserId = new Map([
      ["user-a", "2026-07-09T11:00:00+00:00"],
    ]);

    // Act
    const targets = selectRetentionTargets(
      staleTokens,
      new Set(),
      notifiedAtByUserId,
    );

    // Assert
    expect(targets).toEqual([]);
  });

  it("再訪後にまた離脱したユーザー（notified_at が最終利用より前）は再度対象になる", () => {
    // Arrange: 通知済み 6/10 → 再訪 6/20（updated_at 更新）→ また7日以上離脱
    const staleTokens = [
      {
        user_id: "user-a",
        expo_push_token: "token-a1",
        updated_at: "2026-06-20T00:00:00+00:00",
      },
    ];
    const notifiedAtByUserId = new Map([
      ["user-a", "2026-06-10T11:00:00+00:00"],
    ]);

    // Act
    const targets = selectRetentionTargets(
      staleTokens,
      new Set(),
      notifiedAtByUserId,
    );

    // Assert
    expect(targets).toEqual([{ userId: "user-a", tokens: ["token-a1"] }]);
  });

  it("複数デバイスのうち最新の updated_at で送信済み判定される", () => {
    // Arrange: 古いデバイス 6/1、新しいデバイス 6/20。通知済みは 6/10 なので
    // 最終利用（6/20）が通知より新しく、再度対象になる
    const staleTokens = [
      {
        user_id: "user-a",
        expo_push_token: "token-old",
        updated_at: "2026-06-01T00:00:00+00:00",
      },
      {
        user_id: "user-a",
        expo_push_token: "token-new",
        updated_at: "2026-06-20T00:00:00+00:00",
      },
    ];
    const notifiedAtByUserId = new Map([
      ["user-a", "2026-06-10T11:00:00+00:00"],
    ]);

    // Act
    const targets = selectRetentionTargets(
      staleTokens,
      new Set(),
      notifiedAtByUserId,
    );

    // Assert
    expect(targets).toEqual([
      { userId: "user-a", tokens: ["token-old", "token-new"] },
    ]);
  });

  it("タイムスタンプの Z 形式と +00:00 形式が混在しても正しく比較される", () => {
    // Arrange: 同時刻を異なる表記で比較（文字列比較だと誤判定するケース）
    const staleTokens = [
      {
        user_id: "user-a",
        expo_push_token: "token-a1",
        updated_at: "2026-07-01T00:00:00.000Z",
      },
    ];
    const notifiedAtByUserId = new Map([
      ["user-a", "2026-07-09T11:00:00+00:00"],
    ]);

    // Act
    const targets = selectRetentionTargets(
      staleTokens,
      new Set(),
      notifiedAtByUserId,
    );

    // Assert: 通知済み（7/9）が最終利用（7/1）より後なので除外される
    expect(targets).toEqual([]);
  });
});
