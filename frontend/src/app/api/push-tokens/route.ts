import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server/proxy";

export async function POST(request: NextRequest) {
  return proxyToBackend("/api/push-tokens", {
    method: "POST",
    body: await request.json(),
  });
}

export async function DELETE(request: NextRequest) {
  return proxyToBackend("/api/push-tokens", {
    method: "DELETE",
    body: await request.json(),
  });
}
