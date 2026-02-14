import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));

const STORYBOOK_URL = process.env.STORYBOOK_URL || "http://localhost:6006";
const OUTPUT_DIR =
  process.env.SCREENSHOT_DIR || join(__dirname, "../__screenshots__");

async function main() {
  const res = await fetch(`${STORYBOOK_URL}/index.json`);
  if (!res.ok) {
    throw new Error(`index.json の取得に失敗しました: ${res.status}`);
  }
  const index = await res.json();

  const stories = Object.entries(index.entries).filter(
    ([, entry]) => entry.type === "story",
  );
  console.log(`${stories.length} 件のストーリーを検出しました`);

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  let captured = 0;
  for (const [id] of stories) {
    const page = await context.newPage();
    const url = `${STORYBOOK_URL}/iframe.html?id=${id}&viewMode=story`;

    try {
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);

      const filename = `${id}.png`;
      await page.screenshot({
        path: join(OUTPUT_DIR, filename),
        fullPage: true,
      });
      captured++;
      console.log(`✓ ${id}`);
    } catch (err) {
      console.error(`✗ ${id}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(
    `\n完了: ${captured}/${stories.length} 件のスクリーンショットを ${OUTPUT_DIR} に保存しました`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
