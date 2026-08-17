import type { ReactNode } from "react";
import type { QueueRecord } from "../../types";

// Mirrors the mockup: a line of only caps/digits (6+ chars) becomes a heading.
const HEADING_RE = /^[A-Z0-9 &'\-]{6,}$/;

function renderBody(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  content.split("\n").forEach((line, index) => {
    if (index > 0) nodes.push("\n");
    if (HEADING_RE.test(line)) nodes.push(<h4 key={index}>{line}</h4>);
    else nodes.push(line);
  });
  return nodes;
}

interface EmailPreviewProps {
  record: QueueRecord;
  entity: string;
}

export default function EmailPreview({ record, entity }: EmailPreviewProps) {
  return (
    <div className="mail">
      <div className="mail-head">
        <div className="mail-sub">{record.title}</div>
        <div className="mail-from">{entity} → patient list</div>
      </div>
      <div className="mail-body">{renderBody(record.content)}</div>
    </div>
  );
}
