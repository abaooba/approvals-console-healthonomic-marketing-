import { CHANNELS, chipLabel } from "../lib/format";

const FILTERS = ["All", ...CHANNELS];

export type Tab = "approvals" | "plan";

interface HeaderProps {
  tab: Tab;
  onTab: (tab: Tab) => void;
  count: number;
  filter: string;
  onFilter: (filter: string) => void;
  reviewerName: string;
  onReviewerName: (name: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function Header({
  tab,
  onTab,
  count,
  filter,
  onFilter,
  reviewerName,
  onReviewerName,
  onRefresh,
  refreshing,
}: HeaderProps) {
  return (
    <header>
      <span className="wordmark">
        <span className="dot" />
        Approvals Console
      </span>
      <nav className="tabs">
        <button
          className={`tab${tab === "approvals" ? " on" : ""}`}
          onClick={() => onTab("approvals")}
        >
          Approvals
        </button>
        <button
          className={`tab${tab === "plan" ? " on" : ""}`}
          onClick={() => onTab("plan")}
        >
          Quarterly Plan
        </button>
      </nav>
      {tab === "approvals" && (
        <>
          <span className="pending-pill">{count} pending</span>
          <div className="filters">
            {FILTERS.map((name) => (
              <button
                key={name}
                className={`chip${filter === name ? " on" : ""}`}
                onClick={() => onFilter(name)}
              >
                {chipLabel(name)}
              </button>
            ))}
          </div>
          <button className="chip" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? "↻ Refreshing…" : "↻ Refresh"}
          </button>
        </>
      )}
      <span className={`who${tab === "plan" ? " push" : ""}`}>
        Reviewing as{" "}
        <input
          className="who-name"
          value={reviewerName}
          placeholder="Add your name"
          onChange={(event) => onReviewerName(event.target.value)}
          aria-label="Reviewer name"
        />
      </span>
    </header>
  );
}
