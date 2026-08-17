import type { QueueRecord } from "../../types";

interface GbpPreviewProps {
  record: QueueRecord;
  entity: string;
}

export default function GbpPreview({ record, entity }: GbpPreviewProps) {
  return (
    <div>
      <div className="gbp">
        {record.previewUrl ? (
          <img
            className="gbp-photo"
            src={record.previewUrl}
            alt={record.title}
          />
        ) : (
          <div className="gbp-img">
            <h3>{record.title}</h3>
          </div>
        )}
        <div className="gbp-body">
          <div className="gbp-src">
            {entity}
            {record.gbpLocation ? ` · ${record.gbpLocation}` : ""}
          </div>
          <div className="gbp-text">{record.content}</div>
          <span className="gbp-cta">Call today</span>
        </div>
      </div>
      <div className="gbp-note danger">
        <b>No draft stage on GBP</b> — approving publishes when the publisher
        runs live.
      </div>
    </div>
  );
}
