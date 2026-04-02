import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server/proxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(`/api/notification-preferences/reminders/${id}`, {
    method: "PUT",
    body: await request.json(),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(`/api/notification-preferences/reminders/${id}`, {
    method: "DELETE",
  });
}
