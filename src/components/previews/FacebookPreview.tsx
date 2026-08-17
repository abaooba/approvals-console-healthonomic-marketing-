import { initialOf } from "../../lib/format";
import type { QueueRecord } from "../../types";

interface FacebookPreviewProps {
  record: QueueRecord;
  entity: string;
}

export default function FacebookPreview({
  record,
  entity,
}: FacebookPreviewProps) {
  return (
    <div className="fbcard">
      <div className="fb-head">
        <div className="avatar">{initialOf(entity)}</div>
        <div>
          <div className="fb-name">{entity}</div>
          <div className="fb-meta">Sponsored-free · Just now · 🌐</div>
        </div>
      </div>
      <div className="fb-body">{record.content}</div>
      {record.previewUrl ? (
        <img className="fb-photo" src={record.previewUrl} alt={record.title} />
      ) : (
        <div className="fb-img">
          <h3>{record.title}</h3>
        </div>
      )}
      <div className="fb-bar">
        <span>👍 Like</span>
        <span>💬 Comment</span>
        <span>↗ Share</span>
      </div>
    </div>
  );
}
