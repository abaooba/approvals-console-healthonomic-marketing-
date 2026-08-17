import { ageOf, badgeClass, excerptFor } from "../lib/format";
import type { QueueRecord } from "../types";

interface QueueCardProps {
  record: QueueRecord;
  selected: boolean;
  leaving: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onSendBack: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
}

export default function QueueCard({
  record,
  selected,
  leaving,
  onSelect,
  onApprove,
  onSendBack,
  registerRef,
}: QueueCardProps) {
  return (
    <div
      className={`qcard${selected ? " sel" : ""}${leaving ? " leaving" : ""}`}
      tabIndex={0}
      ref={registerRef}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target === event.currentTarget) {
          onSelect();
        }
      }}
    >
      <div className="qtop">
        <span className={`ch-badge ${badgeClass(record.channel)}`}>
          {record.channel}
        </span>
        {record.gbpLocation && (
          <span className="qloc">📍 {record.gbpLocation}</span>
        )}
        <span className="qage">{ageOf(record.createdTime)}</span>
      </div>
      <div className="qtitle">{record.title || "Untitled draft"}</div>
      <div className="qexcerpt">{excerptFor(record)}</div>
      <div className="qcamp">
        {record.campaign ? `↳ ${record.campaign.campaignName}` : " "}
      </div>
      <div className="quick">
        <button
          className="qa-approve"
          onClick={(event) => {
            event.stopPropagation();
            onApprove();
          }}
        >
          ✓ Approve
        </button>
        <button
          className="qa-back"
          onClick={(event) => {
            event.stopPropagation();
            onSendBack();
          }}
        >
          ↩ Send back
        </button>
      </div>
    </div>
  );
}
