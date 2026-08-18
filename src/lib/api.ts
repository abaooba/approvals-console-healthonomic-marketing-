import type {
  DecisionAction,
  DecisionResponse,
  PlansResponse,
  QueueResponse,
} from "../types";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
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
  reviewedBy: string,
): Promise<DecisionResponse> {
  return request<DecisionResponse>("/api/decide", {
    method: "POST",
    body: JSON.stringify({
      recordId,
      action,
      notes: notes || undefined,
      reviewedBy: reviewedBy || undefined,
    }),
  });
}

export function fetchPlans(): Promise<PlansResponse> {
  return request<PlansResponse>("/api/plans");
}

export function approvePlanGroup(
  recordIds: string[],
): Promise<DecisionResponse> {
  return request<DecisionResponse>("/api/plan-decide", {
    method: "POST",
    body: JSON.stringify({ action: "approve-group", recordIds }),
  });
}

export function rejectPlan(recordId: string): Promise<unknown> {
  return request("/api/plan-decide", {
    method: "POST",
    body: JSON.stringify({ action: "reject", recordId }),
  });
}

export function revisePlan(
  recordId: string,
  notes: string,
  reviewedBy: string,
): Promise<DecisionResponse> {
  return request<DecisionResponse>("/api/plan-decide", {
    method: "POST",
    body: JSON.stringify({
      action: "revise",
      recordId,
      notes,
      reviewedBy: reviewedBy || undefined,
    }),
  });
}
