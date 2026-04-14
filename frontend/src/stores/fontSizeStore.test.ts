import { describe, expect, it } from "vitest";
import {
  fontSizeToIndex,
  getFontSizeLabel,
  getFontSizeValue,
  indexToFontSize,
} from "./fontSizeStore";

describe("getFontSizeValue", () => {
  it("small → 14px", () => {
    expect(getFontSizeValue("small")).toBe(14);
  });

  it("medium → 16px", () => {
    expect(getFontSizeValue("medium")).toBe(16);
  });

  it("large → 20px", () => {
    expect(getFontSizeValue("large")).toBe(20);
  });
});

describe("getFontSizeLabel", () => {
  it("small → 小", () => {
    expect(getFontSizeLabel("small")).toBe("小");
  });

  it("medium → 中", () => {
    expect(getFontSizeLabel("medium")).toBe("中");
  });

  it("large → 大", () => {
    expect(getFontSizeLabel("large")).toBe("大");
  });
});

describe("fontSizeToIndex / indexToFontSize（相互変換）", () => {
  it("small ↔ 0 の相互変換が正確", () => {
    expect(fontSizeToIndex("small")).toBe(0);
    expect(indexToFontSize(0)).toBe("small");
  });

  it("medium ↔ 1 の相互変換が正確", () => {
    expect(fontSizeToIndex("medium")).toBe(1);
    expect(indexToFontSize(1)).toBe("medium");
  });

  it("large ↔ 2 の相互変換が正確", () => {
    expect(fontSizeToIndex("large")).toBe(2);
    expect(indexToFontSize(2)).toBe("large");
  });

  it("不正なindexはmediumにフォールバックする", () => {
    expect(indexToFontSize(99)).toBe("medium");
    expect(indexToFontSize(-1)).toBe("medium");
  });
});
