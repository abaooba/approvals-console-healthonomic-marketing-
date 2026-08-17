import { useState, type ReactNode } from "react";
import { igHandle, initialOf } from "../../lib/format";
import type { QueueRecord } from "../../types";

const CAPTION_LIMIT = 125;

function renderWithTags(text: string): ReactNode[] {
  return text
    .split(/(#[A-Za-z0-9_]+)/g)
    .map((part, index) =>
      part.startsWith("#") ? (
        <span className="tags" key={index}>
          {part}
        </span>
      ) : (
        part
      ),
    );
}

interface InstagramPreviewProps {
  record: QueueRecord;
  entity: string;
}

export default function InstagramPreview({
  record,
  entity,
}: InstagramPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const caption = record.content;
  const truncates = caption.length > CAPTION_LIMIT;
  const handle = igHandle(entity);

  return (
    <div className="phone">
      <div className="phone-screen">
        <div className="ig-head">
          <div className="avatar">{initialOf(entity)}</div>
          <div>
            <div className="ig-name">{handle}</div>
            {record.gbpLocation && (
              <div className="ig-loc">{record.gbpLocation}</div>
            )}
          </div>
        </div>
        {record.previewUrl ? (
          <img className="ig-photo" src={record.previewUrl} alt={record.title} />
        ) : (
          <div className="ig-img">
            <div className="brand-line" />
            <h3>{record.title}</h3>
          </div>
        )}
        <div className="ig-actions">{"♡   💬   ↗"}</div>
        <div className="ig-cap">
          <span className="u">{handle}</span>{" "}
          {!truncates || expanded ? (
            <span className="full">
              {renderWithTags(caption)}
              {truncates && (
                <span className="more" onClick={() => setExpanded(false)}>
                  {" "}
                  less
                </span>
              )}
            </span>
          ) : (
            <>
              {renderWithTags(caption.slice(0, CAPTION_LIMIT))}
              <span className="more" onClick={() => setExpanded(true)}>
                … more
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
