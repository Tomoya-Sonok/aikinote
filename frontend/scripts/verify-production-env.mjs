import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(currentDir, "../../.env.local");

dotenv.config({ path: envPath });

const requiredVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUCKET_NAME",
  "CLOUDFRONT_DOMAIN",
  "NEXT_PUBLIC_CLOUDFRONT_DOMAIN",
];

const missingVariables = requiredVariables.filter(
  (key) => !process.env[key]?.trim(),
);

if (missingVariables.length > 0) {
  console.error(
    [
      "Frontend production environment check failed.",
      "Missing required variables:",
      ...missingVariables.map((key) => `- ${key}`),
      "",
      "For Vercel, set these in Project Settings > Environment Variables for the Production environment and redeploy.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log("Frontend production environment check passed.");
