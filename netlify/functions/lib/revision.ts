import { airtableRequest, type AirtableRecord } from "./airtable";

const WEBHOOK_SOURCE = "approvals-console";
const WEBHOOK_TIMEOUT_MS = 5000;

export function formatNoteEntry(reviewer: string, comment: string): string {
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  return `[${stamp} — ${reviewer || "Reviewer"}] ${comment}`;
}

export function appendNotes(existing: string, entry: string): string {
  const current = existing.trim();
  return current ? `${current}\n\n${entry}` : entry;
}

// Fire an n8n webhook built from env config. Never throws — the n8n workflows
// also self-search Airtable for records in the right status, so a webhook that
// doesn't fire is a soft failure: logged, reported as webhook_fired:false, and
// the record is picked up on the workflow's next run.
export async function fireWebhook(
  pathEnv: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const base = process.env.N8N_BASE_URL;
  const path = process.env[pathEnv];
  if (!base || !path) {
    console.warn(`Webhook skipped: N8N_BASE_URL or ${pathEnv} is not set`);
    return false;
  }
  try {
    const response = await fetch(
      `${base.replace(/\/+$/, "")}/webhook/${path}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, source: WEBHOOK_SOURCE }),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return true;
  } catch (err) {
    console.warn(
      `Webhook ${pathEnv} failed:`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

export interface RevisionResult {
  record: unknown;
  reviewerNotes: string;
  webhookFired: boolean;
}

// The one revision code path, shared by the queue send-back action and the
// plan comment composer: append the comment to Reviewer Notes (history is
// never overwritten), flip the status field to Needs Revision, then kick the
// matching n8n revision workflow.
export async function applyRevision(options: {
  pat: string;
  tablePath: string;
  recordId: string;
  statusField: string;
  comment: string;
  reviewer: string;
  extraFields?: Record<string, string>;
  webhookEnv: string;
}): Promise<RevisionResult> {
  const recordPath = `${options.tablePath}/${encodeURIComponent(options.recordId)}`;
  const current = await airtableRequest<AirtableRecord>(options.pat, recordPath);
  const existing =
    typeof current.fields["Reviewer Notes"] === "string"
      ? (current.fields["Reviewer Notes"] as string)
      : "";
  const reviewerNotes = appendNotes(
    existing,
    formatNoteEntry(options.reviewer, options.comment),
  );

  const record = await airtableRequest(options.pat, recordPath, {
    method: "PATCH",
    body: JSON.stringify({
      fields: {
        [options.statusField]: "Needs Revision",
        "Reviewer Notes": reviewerNotes,
        ...options.extraFields,
      },
    }),
  });

  const webhookFired = await fireWebhook(options.webhookEnv, {
    record_id: options.recordId,
  });
  return { record, reviewerNotes, webhookFired };
}
