import { describe, expect, it } from "vitest";
import {
  buildRecordsContext,
  type TrainingRecordForContext,
} from "./buildContext";
import { checkAiCoachUsageAllowed } from "./usageLimit";

describe("checkAiCoachUsageAllowed", () => {
  it("Free は生涯2回まで許可、3回目以降は free_limit で不可", () => {
    // Arrange & Act & Assert
    expect(
      checkAiCoachUsageAllowed({
        tier: "free",
        lifetimeCount: 1,
        todayCount: 0,
      }),
    ).toEqual({ allowed: true });
    expect(
      checkAiCoachUsageAllowed({
        tier: "free",
        lifetimeCount: 2,
        todayCount: 0,
      }),
    ).toEqual({ allowed: false, reason: "free_limit" });
  });

  it("Premium は当日20回まで許可、21回目で premium_daily_limit で不可", () => {
    // Arrange & Act & Assert
    expect(
      checkAiCoachUsageAllowed({
        tier: "premium",
        lifetimeCount: 9999,
        todayCount: 19,
      }),
    ).toEqual({ allowed: true });
    expect(
      checkAiCoachUsageAllowed({
        tier: "premium",
        lifetimeCount: 9999,
        todayCount: 20,
      }),
    ).toEqual({ allowed: false, reason: "premium_daily_limit" });
  });
});

describe("buildRecordsContext", () => {
  const rec = (
    title: string,
    content: string,
    tags: string[] = [],
  ): TrainingRecordForContext => ({
    title,
    content,
    date: "2026-05-27T00:00:00.000Z",
    tags,
  });

  it("記録が無いときは専用メッセージを返す", () => {
    // Arrange & Act
    const result = buildRecordsContext([]);

    // Assert
    expect(result.includedCount).toBe(0);
    expect(result.truncated).toBe(false);
    expect(result.text).toContain("まだ稽古記録がありません");
  });

  it("文字数予算を超える記録は打ち切り、truncated を立てる", () => {
    // Arrange
    const records = [
      rec("1", "あ".repeat(80)),
      rec("2", "い".repeat(80)),
      rec("3", "う".repeat(80)),
    ];

    // Act
    const result = buildRecordsContext(records, { maxChars: 100 });

    // Assert
    expect(result.includedCount).toBe(1);
    expect(result.truncated).toBe(true);
    expect(result.text).toContain("一部省略");
  });

  it("予算内なら全件含め truncated は false", () => {
    // Arrange
    const records = [rec("基本", "学び", ["立技"])];

    // Act
    const result = buildRecordsContext(records, { maxChars: 10000 });

    // Assert
    expect(result.includedCount).toBe(1);
    expect(result.truncated).toBe(false);
    expect(result.text).toContain("立技");
  });
});
