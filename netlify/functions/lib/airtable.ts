const API_ROOT = "https://api.airtable.com/v0";

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

export class AirtableError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AirtableError";
  }
}

export interface AirtableConfig {
  pat: string;
  baseId: string;
  queueTable: string;
  campaignTable: string;
  entity: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export function getConfig(): AirtableConfig {
  return {
    pat: requireEnv("AIRTABLE_PAT"),
    baseId: requireEnv("AIRTABLE_BASE_ID"),
    queueTable: requireEnv("AIRTABLE_QUEUE_TABLE"),
    campaignTable: requireEnv("AIRTABLE_CAMPAIGN_TABLE"),
    entity: requireEnv("DEFAULT_ENTITY"),
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function airtableRequest<T = unknown>(
  pat: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const request = () =>
    fetch(`${API_ROOT}/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string> | undefined),
      },
    });

  let response = await request();
  if (response.status === 429) {
    await sleep(1000);
    response = await request();
  }

  if (!response.ok) {
    let message = `Airtable request failed (${response.status})`;
    try {
      const payload = (await response.json()) as {
        error?: string | { message?: string };
      };
      if (typeof payload.error === "string") message = payload.error;
      else if (payload.error?.message) message = payload.error.message;
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new AirtableError(response.status, message);
  }

  return (await response.json()) as T;
}

export async function listAllRecords(
  pat: string,
  baseId: string,
  table: string,
  params: URLSearchParams,
): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const query = new URLSearchParams(params);
    if (offset) query.set("offset", offset);
    const page = await airtableRequest<{
      records: AirtableRecord[];
      offset?: string;
    }>(pat, `${baseId}/${encodeURIComponent(table)}?${query.toString()}`);
    records.push(...page.records);
    offset = page.offset;
  } while (offset);
  return records;
}

export function escapeFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
