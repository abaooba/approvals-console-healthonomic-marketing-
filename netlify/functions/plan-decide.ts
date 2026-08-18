import type { Handler } from "@netlify/functions";
import {
  AirtableError,
  airtableRequest,
  getConfig,
  getPlansTable,
  json,
} from "./lib/airtable";
import { applyRevision, fireWebhook } from "./lib/revision";

// The client only ever names an action — the status written to Airtable is
// decided here, never accepted from the request body.
const ACTIONS = ["approve-group", "reject", "revise"] as const;
type PlanAction = (typeof ACTIONS)[number];

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(event.body ?? "");
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("not an object");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json(400, { error: "Request body must be a JSON object" });
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
        try {
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
        } catch (err) {
          // Earlier chunks are already committed in Airtable — say so instead
          // of reporting the whole approval as failed.
          if (updated.length > 0) {
            const message =
              err instanceof Error ? err.message : "Unexpected error";
            // The records that did commit are Approved — still kick the
            // promoter so they don't wait for a manual run.
            const webhookFired = await fireWebhook("N8N_WEBHOOK_PLAN_PROMOTER", {
              record_ids: recordIds.slice(0, updated.length),
            });
            return json(502, {
              error: `${message} — ${updated.length} of ${recordIds.length} briefs were already approved before the failure`,
              records: updated,
              webhook_fired: webhookFired,
            });
          }
          throw err;
        }
      }
      const webhookFired = await fireWebhook("N8N_WEBHOOK_PLAN_PROMOTER", {
        record_ids: recordIds,
      });
      return json(200, { records: updated, webhook_fired: webhookFired });
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
    const reviewedBy =
      typeof body.reviewedBy === "string"
        ? body.reviewedBy.trim().slice(0, 200)
        : "";
    const result = await applyRevision({
      pat: cfg.pat,
      tablePath,
      recordId,
      statusField: "Plan Status",
      comment: notes,
      reviewer: reviewedBy,
      webhookEnv: "N8N_WEBHOOK_PLAN_REVISION",
    });
    return json(200, {
      record: result.record,
      reviewerNotes: result.reviewerNotes,
      webhook_fired: result.webhookFired,
    });
  } catch (err) {
    if (err instanceof AirtableError) return json(502, { error: err.message });
    return json(500, {
      error: err instanceof Error ? err.message : "Unexpected error",
    });
  }
};
