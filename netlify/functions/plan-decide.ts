import type { Handler } from "@netlify/functions";
import {
  AirtableError,
  airtableRequest,
  getConfig,
  getPlansTable,
  json,
} from "./lib/airtable";

// The client only ever names an action — the status written to Airtable is
// decided here, never accepted from the request body.
const ACTIONS = ["approve-group", "reject", "revise"] as const;
type PlanAction = (typeof ACTIONS)[number];

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body ?? "") as Record<string, unknown>;
  } catch {
    return json(400, { error: "Request body must be JSON" });
  }

  const action = body.action;
  if (!ACTIONS.includes(action as PlanAction)) {
    return json(400, {
      error: 'action must be "approve-group", "reject", or "revise"',
    });
  }

  try {
    const cfg = getConfig();
    const tablePath = `${cfg.baseId}/${encodeURIComponent(getPlansTable())}`;

    if (action === "approve-group") {
      const recordIds = Array.isArray(body.recordIds)
        ? body.recordIds.filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          )
        : [];
      if (recordIds.length === 0) {
        return json(400, { error: "recordIds is required" });
      }
      if (recordIds.length > 100) {
        return json(400, { error: "Too many records in one request" });
      }
      const updated: unknown[] = [];
      // Airtable caps batch updates at 10 records per request.
      for (let i = 0; i < recordIds.length; i += 10) {
        const chunk = recordIds.slice(i, i + 10);
        const result = await airtableRequest<{ records: unknown[] }>(
          cfg.pat,
          tablePath,
          {
            method: "PATCH",
            body: JSON.stringify({
              records: chunk.map((id) => ({
                id,
                fields: { "Plan Status": "Approved" },
              })),
            }),
          },
        );
        updated.push(...result.records);
      }
      return json(200, { records: updated });
    }

    const recordId = typeof body.recordId === "string" ? body.recordId : "";
    if (!recordId) return json(400, { error: "recordId is required" });

    if (action === "reject") {
      const record = await airtableRequest(
        cfg.pat,
        `${tablePath}/${encodeURIComponent(recordId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ fields: { "Plan Status": "Rejected" } }),
        },
      );
      return json(200, { record });
    }

    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    if (!notes) {
      return json(400, { error: "Reviewer notes are required for a revision" });
    }
    const record = await airtableRequest(
      cfg.pat,
      `${tablePath}/${encodeURIComponent(recordId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          fields: { "Plan Status": "Needs Revision", "Reviewer Notes": notes },
        }),
      },
    );
    return json(200, { record });
  } catch (err) {
    if (err instanceof AirtableError) return json(502, { error: err.message });
    return json(500, {
      error: err instanceof Error ? err.message : "Unexpected error",
    });
  }
};
