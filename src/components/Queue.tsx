import type { QueueRecord } from "../types";
import QueueCard from "./QueueCard";

interface QueueProps {
  entity: string;
  records: QueueRecord[];
  filter: string;
  loading: boolean;
  selectedId: string | null;
  leavingIds: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onApprove: (record: QueueRecord) => void;
  onSendBack: (record: QueueRecord) => void;
  registerCard: (id: string, el: HTMLDivElement | null) => void;
}

export default function Queue({
  entity,
  records,
  filter,
  loading,
  selectedId,
  leavingIds,
  onSelect,
  onApprove,
  onSendBack,
  registerCard,
}: QueueProps) {
  return (
    <aside className="queue">
      <div className="queue-head">
        Pending review{entity ? ` · ${entity}` : ""}
      </div>
      <div>
        {records.length === 0 ? (
          <div className="empty-queue">
            {loading ? (
              "Loading queue…"
            ) : (
              <>
                <span className="big">0</span>
                Queue clear{filter !== "All" ? ` for ${filter}` : ""}.
                <br />
                Plan Promoter drips the next brief on schedule.
              </>
            )}
          </div>
        ) : (
          records.map((record) => (
            <QueueCard
              key={record.id}
              record={record}
              selected={record.id === selectedId}
              leaving={leavingIds.has(record.id)}
              onSelect={() => onSelect(record.id)}
              onApprove={() => onApprove(record)}
              onSendBack={() => onSendBack(record)}
              registerRef={(el) => registerCard(record.id, el)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
