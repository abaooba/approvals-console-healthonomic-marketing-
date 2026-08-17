import type { Handler } from "@netlify/functions";
import {
  AirtableError,
  escapeFormulaValue,
  getConfig,
  json,
  listAllRecords,
} from "./lib/airtable";

interface Campaign {
  campaignName: string;
  briefObjective: string;
  keyMessaging: string;
  targetAudience: string;
}

const QUEUE_FIELDS = [
  "Draft Title",
  "Draft Content",
  "Channel",
  "Entity",
  "GBP Location",
  "Linked Campaign",
  "Draft Preview",
];

const CAMPAIGN_FIELDS = [
  "Campaign Name",
  "Brief/Objective",
  "Key Messaging",
  "Target Audience",
];

const str = (value: unknown): string => (typeof value === "string" ? value : "");

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  if (!context.clientContext?.user) return json(401, { error: "Unauthorized" });

  try {
    const cfg = getConfig();

    const queueParams = new URLSearchParams({
      filterByFormula: `AND({Status}='Pending', {Entity}='${escapeFormulaValue(cfg.entity)}')`,
    });
    for (const field of QUEUE_FIELDS) queueParams.append("fields[]", field);

    const queueRecords = await listAllRecords(
      cfg.pat,
      cfg.baseId,
      cfg.queueTable,
      queueParams,
    );
    queueRecords.sort(
      (a, b) => Date.parse(a.createdTime) - Date.parse(b.createdTime),
    );

    // Only the first linked campaign is embedded in the response.
    const campaignIds = [
      ...new Set(
        queueRecords.flatMap((record) => {
          const linked = record.fields["Linked Campaign"];
          return Array.isArray(linked) && linked.length > 0
            ? [linked[0] as string]
            : [];
        }),
      ),
    ];

    const campaigns = new Map<string, Campaign>();
    // Chunk the OR() formula: a few hundred IDs would blow Airtable's URL limit.
    for (let i = 0; i < campaignIds.length; i += 100) {
      const chunk = campaignIds.slice(i, i + 100);
      const campaignParams = new URLSearchParams({
        filterByFormula: `OR(${chunk
          .map((id) => `RECORD_ID()='${escapeFormulaValue(id)}'`)
          .join(",")})`,
      });
      for (const field of CAMPAIGN_FIELDS) campaignParams.append("fields[]", field);
      const campaignRecords = await listAllRecords(
        cfg.pat,
        cfg.baseId,
        cfg.campaignTable,
        campaignParams,
      );
      for (const record of campaignRecords) {
        campaigns.set(record.id, {
          campaignName: str(record.fields["Campaign Name"]),
          briefObjective: str(record.fields["Brief/Objective"]),
          keyMessaging: str(record.fields["Key Messaging"]),
          targetAudience: str(record.fields["Target Audience"]),
        });
      }
    }

    const records = queueRecords.map((record) => {
      const fields = record.fields;
      const linked = Array.isArray(fields["Linked Campaign"])
        ? (fields["Linked Campaign"] as string[])
        : [];
      const attachments = Array.isArray(fields["Draft Preview"])
        ? (fields["Draft Preview"] as Array<{ url?: string }>)
        : [];
      return {
        id: record.id,
        title: str(fields["Draft Title"]),
        content: str(fields["Draft Content"]),
        channel: str(fields["Channel"]),
        entity: str(fields["Entity"]),
        gbpLocation: str(fields["GBP Location"]) || null,
        previewUrl: attachments[0]?.url ?? null,
        createdTime: record.createdTime,
        campaign: linked.length > 0 ? (campaigns.get(linked[0]) ?? null) : null,
      };
    });

    return json(200, { entity: cfg.entity, records });
  } catch (err) {
    if (err instanceof AirtableError) return json(502, { error: err.message });
    return json(500, {
      error: err instanceof Error ? err.message : "Unexpected error",
    });
  }
};
