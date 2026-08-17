import type { ReactElement } from "react";
import type { QueueRecord } from "../types";
import BlogPreview from "./previews/BlogPreview";
import EmailPreview from "./previews/EmailPreview";
import FacebookPreview from "./previews/FacebookPreview";
import GbpPreview from "./previews/GbpPreview";
import InstagramPreview from "./previews/InstagramPreview";

interface StageProps {
  record: QueueRecord | null;
  loading: boolean;
  error: string | null;
  entity: string;
}

export default function Stage({ record, loading, error, entity }: StageProps) {
  if (!record) {
    return (
      <main className="stage">
        <div className="empty-queue stage-empty">
          {loading ? (
            "Loading queue…"
          ) : error ? (
            <>
              <span className="big">!</span>
              Couldn&rsquo;t load the queue.
              <br />
              {error}
            </>
          ) : (
            <>
              <span className="big">✓</span>
              All caught up.
            </>
          )}
        </div>
      </main>
    );
  }

  let label: string;
  let preview: ReactElement;
  switch (record.channel) {
    case "Instagram":
      label = "Instagram · feed preview · caption truncates at 125 chars";
      preview = (
        <InstagramPreview key={record.id} record={record} entity={entity} />
      );
      break;
    case "Facebook":
      label =
        "Facebook · page post preview · will publish as unpublished draft first (draft mode)";
      preview = (
        <FacebookPreview key={record.id} record={record} entity={entity} />
      );
      break;
    case "GBP Post":
      label = `GBP Post · ${record.gbpLocation ?? "location not set"} · CALL CTA`;
      preview = <GbpPreview key={record.id} record={record} entity={entity} />;
      break;
    case "Blog":
      label = "Blog · rendered with site typography · publishes via GitHub → Netlify";
      preview = <BlogPreview key={record.id} record={record} />;
      break;
    default:
      label = `${record.channel} · email client preview`;
      preview = (
        <EmailPreview key={record.id} record={record} entity={entity} />
      );
  }

  return (
    <main className="stage">
      <div className="stage-label">
        Previewing · <b>{label}</b>
      </div>
      {preview}
    </main>
  );
}
