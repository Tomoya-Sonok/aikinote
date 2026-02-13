import { readFileSync, existsSync } from "fs";
import { execSync, spawnSync } from "child_process";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "..");
const envFilePath = join(rootDir, ".env.local");
const backendDir = join(rootDir, "backend");

// .env.local の存在確認
if (!existsSync(envFilePath)) {
  console.error(".env.local file not found at project root.");
  process.exit(1);
}

// .env.local のパース
const envContent = readFileSync(envFilePath, "utf8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return;

  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();

    // 引用符の除去 (簡易実装: 値が引用符で囲まれている場合のみ)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    envVars[key] = value;
  }
});

const keys = Object.keys(envVars);

if (keys.length === 0) {
  console.log("No environment variables found in .env.local.");
  process.exit(0);
}

console.log(`Found ${keys.length} secrets in .env.local to update.`);

// 除外するキーがあればここでフィルタリング（今回はすべて更新）
// 例: const EXCLUDE_KEYS = ["NEXT_PUBLIC_IS_DOCKER"];

let successCount = 0;
let failCount = 0;

for (const key of keys) {
  const value = envVars[key];
  if (!value) {
    console.warn(`Skipping empty value for key: ${key}`);
    continue;
  }

  process.stdout.write(`Updating secret: ${key} ... `);

  try {
    // wrangler secret put <KEY> を実行
    // 標準入力に値を流し込む
    const result = spawnSync("pnpm", ["wrangler", "secret", "put", key], {
      cwd: backendDir,
      input: value,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"], // stdout/stderrをキャプチャして余計なログを抑制
    });

    if (result.status === 0) {
      console.log("✅ OK");
      successCount++;
    } else {
      console.log("❌ Failed");
      console.error(result.stderr); // エラー詳細を出力
      failCount++;
    }
  } catch (error) {
    console.log("❌ Error");
    console.error(error);
    failCount++;
  }
}

console.log("\nSummary:");
console.log(`✅ Success: ${successCount}`);
console.log(`❌ Failed: ${failCount}`);

if (successCount > 0) {
  console.log(
    "\nNote: Cloudflare Workers will automatically restart after secret updates."
  );
}
