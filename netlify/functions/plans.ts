import type { Handler } from "@netlify/functions";
import {
  AirtableError,
  getConfig,
  getPlansTable,
  json,
  listAllRecords,
} from "./lib/airtable";

const PLAN_FIELDS = [
  "Campaign Group",
  "Month",
  "Campaign Name",
  "Channel",
  "Scheduled Publish Date",
  "Plan Status",
  "Brief/Objective",
  "Key Messaging",
  "Target Keyword",
  "GBP Location",
  "Rationale",
  "Reviewer Notes",
];

const str = (value: unknown): string => (typeof value === "string" ? value : "");

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  try {
    const cfg = getConfig();
    const plansTable = getPlansTable();

    const params = new URLSearchParams({
      filterByFormula: "{Plan Status} != 'Pushed to Tracker'",
    });
    params.append("sort[0][field]", "Scheduled Publish Date");
    params.append("sort[0][direction]", "asc");
    for (const field of PLAN_FIELDS) params.append("fields[]", field);

    const records = await listAllRecords(cfg.pat, cfg.baseId, plansTable, params);

    return json(200, {
      records: records.map((record) => ({
        id: record.id,
        campaignGroup: str(record.fields["Campaign Group"]),
        month: str(record.fields["Month"]),
        campaignName: str(record.fields["Campaign Name"]),
        channel: str(record.fields["Channel"]),
        scheduledDate: str(record.fields["Scheduled Publish Date"]) || null,
        planStatus: str(record.fields["Plan Status"]),
        briefObjective: str(record.fields["Brief/Objective"]),
        keyMessaging: str(record.fields["Key Messaging"]),
        targetKeyword: str(record.fields["Target Keyword"]),
        gbpLocation: str(record.fields["GBP Location"]),
        rationale: str(record.fields["Rationale"]),
        reviewerNotes: str(record.fields["Reviewer Notes"]),
      })),
    });
  } catch (err) {
    if (err instanceof AirtableError) return json(502, { error: err.message });
    return json(500, {
      error: err instanceof Error ? err.message : "Unexpected error",
    });
  }
};
