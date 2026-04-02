import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server/proxy";

export async function POST(request: NextRequest) {
  return proxyToBackend("/api/notification-preferences/reminders", {
    method: "POST",
    body: await request.json(),
  });
}
