import { describe, expect, it } from "vitest";
import type { AiCoachConversation } from "@/lib/api/aiCoach";
import { groupConversationsByDate } from "./groupConversationsByDate";

const conv = (id: string, updatedAtJst: string): AiCoachConversation => ({
  id,
  title: `title-${id}`,
  // updatedAtJst は JST 形式の文字列。Z（UTC）で扱うため -09:00 補正して与える。
  updated_at: new Date(`${updatedAtJst}+09:00`).toISOString(),
});

// JST で 2026-05-30 12:00 を「今」とする
const now = new Date("2026-05-30T12:00:00+09:00");

describe("groupConversationsByDate", () => {
  it("「今日」「昨日」「過去7日」「過去30日」「それ以前」に正しく分類する", () => {
    // Arrange
    const conversations: AiCoachConversation[] = [
      conv("today1", "2026-05-30T10:00"),
      conv("today2", "2026-05-30T00:30"),
      conv("yesterday", "2026-05-29T23:59"),
      conv("last7", "2026-05-26T08:00"),
      conv("last30", "2026-05-10T12:00"),
      conv("older", "2026-04-01T00:00"),
    ];

    // Act
    const groups = groupConversationsByDate(conversations, now);

    // Assert
    expect(groups.map((g) => g.key)).toEqual([
      "today",
      "yesterday",
      "last7",
      "last30",
      "older",
    ]);
    expect(groups[0].conversations.map((c) => c.id)).toEqual([
      "today1",
      "today2",
    ]);
    expect(groups[1].conversations.map((c) => c.id)).toEqual(["yesterday"]);
    expect(groups[2].conversations.map((c) => c.id)).toEqual(["last7"]);
    expect(groups[3].conversations.map((c) => c.id)).toEqual(["last30"]);
    expect(groups[4].conversations.map((c) => c.id)).toEqual(["older"]);
  });

  it("空グループは結果から除外する", () => {
    // Arrange
    const conversations: AiCoachConversation[] = [
      conv("a", "2026-05-30T10:00"),
      conv("b", "2026-04-01T00:00"),
    ];

    // Act
    const groups = groupConversationsByDate(conversations, now);

    // Assert
    expect(groups.map((g) => g.key)).toEqual(["today", "older"]);
  });

  it("空入力は空配列を返す", () => {
    // Arrange & Act
    const groups = groupConversationsByDate([], now);

    // Assert
    expect(groups).toEqual([]);
  });
});
