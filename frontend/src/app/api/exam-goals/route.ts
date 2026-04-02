import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server/proxy";

export function GET() {
  return proxyToBackend("/api/exam-goals");
}

export async function PUT(request: NextRequest) {
  return proxyToBackend("/api/exam-goals", {
    method: "PUT",
    body: await request.json(),
  });
}

export function DELETE() {
  return proxyToBackend("/api/exam-goals", { method: "DELETE" });
}
