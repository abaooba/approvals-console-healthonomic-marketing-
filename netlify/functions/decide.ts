import type { Handler } from "@netlify/functions";
import {
  AirtableError,
  airtableRequest,
  getConfig,
  json,
  type AirtableRecord,
} from "./lib/airtable";
import { appendNotes, applyRevision, formatNoteEntry } from "./lib/revision";

// The client only ever names an action — the status written to Airtable is
// decided here, never accepted from the request body. Access control is
// Netlify's site-wide password protection, which fronts /api/* too.

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

  const recordId = typeof body.recordId === "string" ? body.recordId : "";
  const action = body.action;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const reviewedBy =
    typeof body.reviewedBy === "string"
      ? body.reviewedBy.trim().slice(0, 200)
      : "";

  if (!recordId) return json(400, { error: "recordId is required" });
  if (action !== "approve" && action !== "revise") {
    return json(400, { error: 'action must be "approve" or "revise"' });
  }
  if (action === "revise" && !notes) {
    return json(400, {
      error: "Reviewer notes are required to send a draft back for revision",
    });
  }

  try {
    const cfg = getConfig();
    const tablePath = `${cfg.baseId}/${encodeURIComponent(cfg.queueTable)}`;

    if (action === "revise") {
      const result = await applyRevision({
        pat: cfg.pat,
        tablePath,
        recordId,
        statusField: "Status",
        comment: notes,
        reviewer: reviewedBy,
        extraFields: reviewedBy ? { "Reviewed By": reviewedBy } : undefined,
        webhookEnv: "N8N_WEBHOOK_REVISION",
      });
      return json(200, {
        record: result.record,
        reviewerNotes: result.reviewerNotes,
        webhook_fired: result.webhookFired,
      });
    }

    const recordPath = `${tablePath}/${encodeURIComponent(recordId)}`;
    const fields: Record<string, string> = { Status: "Approved" };
    if (reviewedBy) fields["Reviewed By"] = reviewedBy;
    if (notes) {
      // A note on approval joins the comment history too — never overwrite it.
      const current = await airtableRequest<AirtableRecord>(cfg.pat, recordPath);
      const existing =
        typeof current.fields["Reviewer Notes"] === "string"
          ? (current.fields["Reviewer Notes"] as string)
          : "";
      fields["Reviewer Notes"] = appendNotes(
        existing,
        formatNoteEntry(reviewedBy, notes),
      );
    }
    const record = await airtableRequest(cfg.pat, recordPath, {
      method: "PATCH",
      body: JSON.stringify({ fields }),
    });
    return json(200, { record });
  } catch (err) {
    if (err instanceof AirtableError) return json(502, { error: err.message });
    return json(500, {
      error: err instanceof Error ? err.message : "Unexpected error",
    });
  }
};
