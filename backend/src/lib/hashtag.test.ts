import { describe, expect, it } from "vitest";
import { extractHashtags } from "./hashtag.js";

describe("extractHashtags", () => {
  it("行頭のハッシュタグを抽出する", () => {
    // Arrange
    const content = "#稽古 今日の練習内容";

    // Act
    const result = extractHashtags(content);

    // Assert
    expect(result).toEqual(["稽古"]);
  });

  it("半角スペース直後のハッシュタグを抽出する", () => {
    // Arrange
    const content = "今日の #合気道 の稽古";

    // Act
    const result = extractHashtags(content);

    // Assert
    expect(result).toEqual(["合気道"]);
  });

  it("全角スペース直後のハッシュタグを抽出する", () => {
    // Arrange
    const content = "今日は\u3000#四方投げ\u3000を練習した";

    // Act
    const result = extractHashtags(content);

    // Assert
    expect(result).toEqual(["四方投げ"]);
  });

  it("複数のハッシュタグを抽出し重複を排除する", () => {
    // Arrange
    const content = "#合気道 #四方投げ #合気道 #稽古";

    // Act
    const result = extractHashtags(content);

    // Assert: #合気道 は1回のみ
    expect(result).toEqual(["合気道", "四方投げ", "稽古"]);
  });

  it("英数字のハッシュタグを抽出する", () => {
    // Arrange
    const content = "#aikido #Training123";

    // Act
    const result = extractHashtags(content);

    // Assert
    expect(result).toEqual(["aikido", "Training123"]);
  });

  it("アンダースコア付きのハッシュタグを抽出する", () => {
    // Arrange
    const content = "#合気道_練習";

    // Act
    const result = extractHashtags(content);

    // Assert
    expect(result).toEqual(["合気道_練習"]);
  });

  it("スペースなしで単語に続く#はハッシュタグとして認識しない", () => {
    // Arrange
    const content = "テスト#タグ";

    // Act
    const result = extractHashtags(content);

    // Assert: #の前にスペースがないので抽出されない
    expect(result).toEqual([]);
  });

  it("空文字列からは空配列を返す", () => {
    // Arrange
    const content = "";

    // Act
    const result = extractHashtags(content);

    // Assert
    expect(result).toEqual([]);
  });

  it("ハッシュタグが20個を超える場合は最大20個まで抽出する", () => {
    // Arrange: 25個のハッシュタグを含むテキスト
    const tags = Array.from({ length: 25 }, (_, i) => `#タグ${i}`);
    const content = tags.join(" ");

    // Act
    const result = extractHashtags(content);

    // Assert: MAX_HASHTAGS = 20
    expect(result).toHaveLength(20);
  });

  it("#のみ（タグ名なし）は抽出しない", () => {
    // Arrange
    const content = "# だけの場合";

    // Act
    const result = extractHashtags(content);

    // Assert
    expect(result).toEqual([]);
  });
});
