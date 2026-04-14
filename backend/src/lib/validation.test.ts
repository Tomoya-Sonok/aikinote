import { describe, expect, it } from "vitest";
import {
  createPageSchema,
  createSocialPostSchema,
  createSocialReplySchema,
  getPagesSchema,
  getTrainingDatesSchema,
  resolveTagNames,
} from "./validation.js";

describe("resolveTagNames", () => {
  it("tags（新形式）が存在する場合はtagsをそのまま返す", () => {
    // Arrange
    const input = {
      tags: { 取り: ["立技"], 受け: ["正面打ち"] },
      tori: ["無視される"],
    };

    // Act
    const result = resolveTagNames(input);

    // Assert: 新形式が優先される
    expect(result).toEqual({ 取り: ["立技"], 受け: ["正面打ち"] });
  });

  it("tagsが空オブジェクトの場合はtori/uke/wazaから統合する", () => {
    // Arrange
    const input = {
      tags: {},
      tori: ["立技"],
      uke: ["正面打ち"],
      waza: ["四方投げ"],
    };

    // Act
    const result = resolveTagNames(input);

    // Assert: 旧形式から「取り」「受け」「技」に変換
    expect(result).toEqual({
      取り: ["立技"],
      受け: ["正面打ち"],
      技: ["四方投げ"],
    });
  });

  it("tagsが未定義の場合はtori/uke/wazaから統合する", () => {
    // Arrange
    const input = { tori: ["座技"], waza: ["入身投げ"] };

    // Act
    const result = resolveTagNames(input);

    // Assert: ukeが空なのでキーに含まれない
    expect(result).toEqual({ 取り: ["座技"], 技: ["入身投げ"] });
  });

  it("すべて空の場合は空オブジェクトを返す", () => {
    // Arrange
    const input = { tori: [], uke: [], waza: [] };

    // Act
    const result = resolveTagNames(input);

    // Assert
    expect(result).toEqual({});
  });
});

describe("createPageSchema", () => {
  const validInput = {
    title: "稽古メモ",
    content: "今日は四方投げの稽古をしました",
    user_id: "user-1",
  };

  it("必須フィールドのみで通過する", () => {
    // Act
    const result = createPageSchema.safeParse(validInput);

    // Assert
    expect(result.success).toBe(true);
  });

  it("タイトルが空文字の場合はエラーになる", () => {
    // Arrange
    const input = { ...validInput, title: "" };

    // Act
    const result = createPageSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("タイトルが101文字の場合はエラーになる", () => {
    // Arrange
    const input = { ...validInput, title: "あ".repeat(101) };

    // Act
    const result = createPageSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("タイトルが100文字ちょうどの場合は通過する（境界値）", () => {
    // Arrange
    const input = { ...validInput, title: "あ".repeat(100) };

    // Act
    const result = createPageSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it("内容が3001文字の場合はエラーになる", () => {
    // Arrange
    const input = { ...validInput, content: "あ".repeat(3001) };

    // Act
    const result = createPageSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("created_atがISO 8601形式の場合は通過する", () => {
    // Arrange
    const input = {
      ...validInput,
      created_at: "2026-01-15T10:00:00.000Z",
    };

    // Act
    const result = createPageSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it("created_atが非ISO形式の場合はエラーになる", () => {
    // Arrange
    const input = {
      ...validInput,
      created_at: "2026-01-15 10:00:00",
    };

    // Act
    const result = createPageSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("新形式のtagsフィールドが通過する", () => {
    // Arrange
    const input = {
      ...validInput,
      tags: { 取り: ["立技"], 技: ["四方投げ"] },
    };

    // Act
    const result = createPageSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });
});

describe("getPagesSchema", () => {
  it("limit文字列が整数に変換される", () => {
    // Arrange
    const input = { user_id: "user-1", limit: "50" };

    // Act
    const result = getPagesSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it("limitが0の場合はエラーになる（最小値は1）", () => {
    // Arrange
    const input = { user_id: "user-1", limit: "0" };

    // Act
    const result = getPagesSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("limitが101の場合はエラーになる（最大値は100）", () => {
    // Arrange
    const input = { user_id: "user-1", limit: "101" };

    // Act
    const result = getPagesSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("limit未指定時はデフォルト20が適用される", () => {
    // Arrange
    const input = { user_id: "user-1" };

    // Act
    const result = getPagesSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it("sort_orderがnewest/oldest以外の場合はエラーになる", () => {
    // Arrange
    const input = { user_id: "user-1", sort_order: "invalid" };

    // Act
    const result = getPagesSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("getTrainingDatesSchema", () => {
  it("年月の文字列が整数に変換される", () => {
    // Arrange
    const input = { user_id: "user-1", year: "2026", month: "3" };

    // Act
    const result = getTrainingDatesSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.year).toBe(2026);
      expect(result.data.month).toBe(3);
    }
  });

  it("月が13の場合はエラーになる（最大値は12）", () => {
    // Arrange
    const input = { user_id: "user-1", year: "2026", month: "13" };

    // Act
    const result = getTrainingDatesSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("月が0の場合はエラーになる（最小値は1）", () => {
    // Arrange
    const input = { user_id: "user-1", year: "2026", month: "0" };

    // Act
    const result = getTrainingDatesSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("createSocialPostSchema", () => {
  it("有効な投稿データが通過する", () => {
    // Arrange
    const input = {
      user_id: "user-1",
      content: "今日の稽古は充実していました",
      post_type: "post",
    };

    // Act
    const result = createSocialPostSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it("contentが2001文字の場合はエラーになる", () => {
    // Arrange
    const input = {
      user_id: "user-1",
      content: "あ".repeat(2001),
      post_type: "post",
    };

    // Act
    const result = createSocialPostSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("post_typeがpost/training_record以外の場合はエラーになる", () => {
    // Arrange
    const input = {
      user_id: "user-1",
      content: "テスト",
      post_type: "invalid",
    };

    // Act
    const result = createSocialPostSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("createSocialReplySchema", () => {
  it("返信内容が1001文字の場合はエラーになる（上限は1000文字）", () => {
    // Arrange
    const input = {
      user_id: "user-1",
      content: "あ".repeat(1001),
    };

    // Act
    const result = createSocialReplySchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("返信内容が1000文字ちょうどの場合は通過する（境界値）", () => {
    // Arrange
    const input = {
      user_id: "user-1",
      content: "あ".repeat(1000),
    };

    // Act
    const result = createSocialReplySchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });
});
