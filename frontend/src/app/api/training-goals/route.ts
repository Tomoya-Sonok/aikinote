import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server/proxy";

export function GET() {
  return proxyToBackend("/api/training-dates/goal");
}

export async function PUT(request: NextRequest) {
  return proxyToBackend("/api/training-dates/goal", {
    method: "PUT",
    body: await request.json(),
  });
}
