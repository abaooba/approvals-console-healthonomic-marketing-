import type { QueueRecord } from "../types";

export const CHANNELS = [
  "Instagram",
  "Facebook",
  "Blog",
  "GBP Post",
  "Newsletter",
  "Email",
] as const;

export function chipLabel(channel: string): string {
  return channel === "GBP Post" ? "GBP" : channel;
}

export function badgeClass(channel: string): string {
  return `ch-${channel.split(" ")[0]}`;
}

export function publisherFor(channel: string): string {
  switch (channel) {
    case "Blog":
      return "Blog Publisher (GitHub → Netlify)";
    case "GBP Post":
      return "GBP Publisher";
    case "Newsletter":
      return "Newsletter Publisher";
    case "Email":
      return "Email Publisher";
    default:
      return "Meta Publisher";
  }
}

export function ageOf(createdTime: string): string {
  const elapsed = Date.now() - Date.parse(createdTime);
  const minutes = Math.max(1, Math.floor(elapsed / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "");
}

export function excerptFor(record: QueueRecord): string {
  const text =
    record.channel === "Blog" ? stripMarkdown(record.content) : record.content;
  return text.replace(/\s+/g, " ").trim();
}

export function truncateTitle(title: string): string {
  return title.length > 42 ? `${title.slice(0, 42)}…` : title;
}

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");
  return slug || "draft";
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function formatCreated(createdTime: string): string {
  return new Date(createdTime).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function statusClass(status: string): string {
  return `st-${(status || "Proposed").replace(/\s+/g, "-")}`;
}

// Date-only strings must be parsed as local dates — new Date("2026-09-03")
// is UTC midnight, which renders as the previous day in western timezones.
export function formatDateOnly(value: string | null): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function initialOf(entity: string): string {
  return (entity.charAt(0) || "•").toUpperCase();
}

export function igHandle(entity: string): string {
  return entity.toLowerCase().replace(/[^a-z0-9._]/g, "") || "account";
}
