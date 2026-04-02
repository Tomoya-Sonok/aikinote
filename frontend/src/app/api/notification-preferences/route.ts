import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server/proxy";

export function GET() {
  return proxyToBackend("/api/notification-preferences");
}

export async function PUT(request: NextRequest) {
  return proxyToBackend("/api/notification-preferences", {
    method: "PUT",
    body: await request.json(),
  });
}
