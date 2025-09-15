import { hc } from "hono/client";
import type { ApiRoutes } from "@/app/api/tags/route";

const client = hc<ApiRoutes>("/");

export { client };
