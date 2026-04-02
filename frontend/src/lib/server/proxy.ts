import { NextResponse } from "next/server";
import { buildApiUrl, createBackendAuthToken } from "./auth";

type ProxyOptions = {
  method?: string;
  body?: unknown;
  searchParams?: URLSearchParams;
};

export async function proxyToBackend(
  backendPath: string,
  options: ProxyOptions = {},
): Promise<NextResponse> {
  const token = await createBackendAuthToken();
  if (!token) {
    return NextResponse.json({ error: "認証エラー" }, { status: 401 });
  }

  let url = buildApiUrl(backendPath);
  if (options.searchParams) {
    const qs = options.searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
