import { useEffect, useRef } from "react";
import { formatCreated, parseReviewerNotes } from "../lib/format";
import type { QueueRecord } from "../types";

const NOTES_PLACEHOLDER =
  "Required for Send back — lands in Reviewer Notes and triggers the Revision Loop.";
const NOTES_ERR_PLACEHOLDER =
  "A note is required — the Revision Loop needs direction, not just a rejection.";

interface ContextRailProps {
  record: QueueRecord | null;
  notes: string;
  notesErr: boolean;
  focusTick: number;
  busy: boolean;
  onNotesChange: (value: string) => void;
  onApprove: () => void;
  onSendBack: () => void;
}

export default function ContextRail({
  record,
  notes,
  notesErr,
  focusTick,
  busy,
  onNotesChange,
  onApprove,
  onSendBack,
}: ContextRailProps) {
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focusTick > 0) notesRef.current?.focus();
  }, [focusTick]);

  if (!record) return <aside className="context" />;

  return (
    <aside className="context">
      <div className="ctx-sec">
        <h4>Campaign brief</h4>
        <div className="brief-card">
          {record.campaign ? (
            <>
              <div className="row">
                <span className="k">Brief / Objective</span>
                {record.campaign.briefObjective || "—"}
              </div>
              <div className="row">
                <span className="k">Key messaging (CTA source)</span>
                {record.campaign.keyMessaging || "—"}
              </div>
              <div className="row">
                <span className="k">Target audience</span>
                {record.campaign.targetAudience || "—"}
              </div>
            </>
          ) : (
            <div className="row none">No linked campaign on this record.</div>
          )}
        </div>
      </div>
      <div className="ctx-sec">
        <h4>Record</h4>
        <div className="meta-list">
          <div className="m">
            <span className="k">Record</span>
            <span className="v">{record.id}</span>
          </div>
          <div className="m">
            <span className="k">Status</span>
            <span className="v">Pending</span>
          </div>
          <div className="m">
            <span className="k">Created</span>
            <span className="v">{formatCreated(record.createdTime)}</span>
          </div>
          <div className="m">
            <span className="k">Channel</span>
            <span className="v">{record.channel}</span>
          </div>
          {record.gbpLocation && (
            <div className="m">
              <span className="k">GBP location</span>
              <span className="v">{record.gbpLocation}</span>
            </div>
          )}
        </div>
      </div>
      {record.reviewerNotes && (
        <div className="ctx-sec">
          <h4>Comment history</h4>
          <div className="cthread">
            {parseReviewerNotes(record.reviewerNotes).map((entry, i) => (
              <div className="cmt" key={i}>
                {(entry.name || entry.time) && (
                  <div className="cmt-meta">
                    {entry.name || "Note"}
                    {entry.time ? ` · ${entry.time}` : ""}
                  </div>
                )}
                <div className="cmt-text">{entry.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="ctx-sec ctx-notes">
        <h4>Reviewer notes</h4>
        <textarea
          ref={notesRef}
          className={`notes${notesErr ? " err" : ""}`}
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder={notesErr ? NOTES_ERR_PLACEHOLDER : NOTES_PLACEHOLDER}
        />
      </div>
      <div className="btn-row">
        <button className="btn btn-approve" onClick={onApprove} disabled={busy}>
          ✓ Approve{record.channel === "GBP Post" ? " (publishes)" : ""}
        </button>
        <button className="btn btn-back" onClick={onSendBack} disabled={busy}>
          {busy ? "Sending…" : "↩ Send back with comments"}
        </button>
        <div className="btn-note">
          Approve → <code>Status: Approved</code> → Airtable automation fires
          n8n webhook → Dispatcher routes to publisher
        </div>
      </div>
    </aside>
  );
}
