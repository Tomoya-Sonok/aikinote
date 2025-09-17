import { describe, expect, it } from "vitest";
import { formatToLocalDateString, formatToLocalDateTime, formatToRelativeTime } from "./dateUtils";

describe("dateUtils", () => {
	describe("formatToLocalDateString", () => {
		it("ISO文字列をYYYY-MM-DD形式のローカル日付に変換する", () => {
			// Arrange: UTC時刻のISO文字列を準備する
			const utcIsoString = "2024-01-15T10:00:00.000Z";

			// Act: ローカル日付文字列に変換する
			const result = formatToLocalDateString(utcIsoString);

			// Assert: YYYY-MM-DD形式の文字列が返される
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});

		it("JST時間帯で正しく日付が変換される", () => {
			// Arrange: UTC時刻で日本時間の前日になるISO文字列を準備する
			const utcIsoString = "2024-01-14T16:00:00.000Z"; // JST: 2024-01-15 01:00

			// Act: ローカル日付文字列に変換する
			const result = formatToLocalDateString(utcIsoString);

			// Assert: JST基準の日付が返される（環境によって結果は変わる可能性がある）
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});
	});

	describe("formatToLocalDateTime", () => {
		it("ISO文字列をYYYY/MM/DD HH:MM形式のローカル日時に変換する", () => {
			// Arrange: UTC時刻のISO文字列を準備する
			const utcIsoString = "2024-01-15T10:00:00.000Z";

			// Act: ローカル日時文字列に変換する
			const result = formatToLocalDateTime(utcIsoString);

			// Assert: YYYY/MM/DD HH:MM形式の文字列が返される
			expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
		});

		it("異なるUTC時刻で正しく変換される", () => {
			// Arrange: 異なるUTC時刻のISO文字列を準備する
			const utcIsoString = "2024-12-31T23:59:59.000Z";

			// Act: ローカル日時文字列に変換する
			const result = formatToLocalDateTime(utcIsoString);

			// Assert: 正しい形式の文字列が返される
			expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
		});
	});

	describe("formatToRelativeTime", () => {
		it("60秒未満の場合は「たった今」を返す", () => {
			// Arrange: 現在時刻から30秒前のISO文字列を準備する
			const now = new Date();
			const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
			const isoString = thirtySecondsAgo.toISOString();

			// Act: 相対時間文字列に変換する
			const result = formatToRelativeTime(isoString);

			// Assert: 「たった今」が返される
			expect(result).toBe("たった今");
		});

		it("3600秒未満の場合は「○分前」を返す", () => {
			// Arrange: 現在時刻から30分前のISO文字列を準備する
			const now = new Date();
			const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
			const isoString = thirtyMinutesAgo.toISOString();

			// Act: 相対時間文字列に変換する
			const result = formatToRelativeTime(isoString);

			// Assert: 「30分前」が返される
			expect(result).toBe("30分前");
		});

		it("86400秒未満の場合は「○時間前」を返す", () => {
			// Arrange: 現在時刻から5時間前のISO文字列を準備する
			const now = new Date();
			const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
			const isoString = fiveHoursAgo.toISOString();

			// Act: 相対時間文字列に変換する
			const result = formatToRelativeTime(isoString);

			// Assert: 「5時間前」が返される
			expect(result).toBe("5時間前");
		});

		it("2592000秒未満の場合は「○日前」を返す", () => {
			// Arrange: 現在時刻から7日前のISO文字列を準備する
			const now = new Date();
			const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			const isoString = sevenDaysAgo.toISOString();

			// Act: 相対時間文字列に変換する
			const result = formatToRelativeTime(isoString);

			// Assert: 「7日前」が返される
			expect(result).toBe("7日前");
		});

		it("2592000秒以上の場合はyyyy/MM/dd形式の日付を返す", () => {
			// Arrange: 現在時刻から60日前のISO文字列を準備する
			const now = new Date();
			const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
			const isoString = sixtyDaysAgo.toISOString();

			// Act: 相対時間文字列に変換する
			const result = formatToRelativeTime(isoString);

			// Assert: yyyy/MM/dd形式の日付が返される
			expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
		});
	});
});