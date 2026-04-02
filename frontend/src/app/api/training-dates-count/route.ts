import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server/proxy";

export function GET(request: NextRequest) {
  return proxyToBackend("/api/training-dates/count", {
    searchParams: request.nextUrl.searchParams,
  });
}
