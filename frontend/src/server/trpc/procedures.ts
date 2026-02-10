import { z } from "zod";
import { publicProcedure } from "./index";

export const healthProcedure = publicProcedure
  .output(
    z.object({
      ok: z.literal(true),
      message: z.string(),
    }),
  )
  .query(() => {
    return {
      ok: true,
      message: "tRPC route is ready",
    };
  });

export const honoBridgeTodoProcedure = publicProcedure
  .input(
    z.object({
      // TODO: 実運用時に `path` など必要な入力を定義する
      path: z.string(),
    }),
  )
  .query(async ({ input }) => {
    // TODO: ここで Hono API を呼び出し、型付きの出力へ整形する
    // 例: fetch(`${process.env.NEXT_PUBLIC_API_URL}${input.path}`)
    return {
      ok: false as const,
      message: "未実装です。TODO を実装して利用を開始してください。",
      path: input.path,
    };
  });
