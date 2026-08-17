import type { DecisionAction, QueueResponse } from "../types";
import { getToken } from "./identity";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const body = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && body.error
        ? body.error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

export function fetchQueue(): Promise<QueueResponse> {
  return request<QueueResponse>("/api/queue");
}

export function sendDecision(
  recordId: string,
  action: DecisionAction,
  notes: string,
): Promise<unknown> {
  return request("/api/decide", {
    method: "POST",
    body: JSON.stringify({ recordId, action, notes: notes || undefined }),
  });
}
