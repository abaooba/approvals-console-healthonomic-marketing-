import type { Handler } from "@netlify/functions";
import {
  AirtableError,
  airtableRequest,
  getConfig,
  json,
} from "./lib/airtable";

interface IdentityUser {
  email?: string;
}

// The client only ever names an action — the status written to Airtable is
// decided here, never accepted from the request body.
const STATUS_FOR_ACTION = {
  approve: "Approved",
  revise: "Needs Revision",
} as const;

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const user = context.clientContext?.user as IdentityUser | undefined;
  if (!user?.email) return json(401, { error: "Unauthorized" });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body ?? "") as Record<string, unknown>;
  } catch {
    return json(400, { error: "Request body must be JSON" });
  }

  const recordId = typeof body.recordId === "string" ? body.recordId : "";
  const action = body.action;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  if (!recordId) return json(400, { error: "recordId is required" });
  if (action !== "approve" && action !== "revise") {
    return json(400, { error: 'action must be "approve" or "revise"' });
  }
  if (action === "revise" && !notes) {
    return json(400, {
      error: "Reviewer notes are required to send a draft back for revision",
    });
  }

  const fields: Record<string, string> = {
    Status: STATUS_FOR_ACTION[action],
    "Reviewed By": user.email,
  };
  if (notes) fields["Reviewer Notes"] = notes;

  try {
    const cfg = getConfig();
    const record = await airtableRequest(
      cfg.pat,
      `${cfg.baseId}/${encodeURIComponent(cfg.queueTable)}/${encodeURIComponent(recordId)}`,
      { method: "PATCH", body: JSON.stringify({ fields }) },
    );
    return json(200, { record });
  } catch (err) {
    if (err instanceof AirtableError) return json(502, { error: err.message });
    return json(500, {
      error: err instanceof Error ? err.message : "Unexpected error",
    });
  }
};
