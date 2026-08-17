import { CHANNELS, chipLabel } from "../lib/format";

const FILTERS = ["All", ...CHANNELS];

interface HeaderProps {
  count: number;
  filter: string;
  onFilter: (filter: string) => void;
  userName: string;
  onRefresh: () => void;
  refreshing: boolean;
  onSignOut: () => void;
}

export default function Header({
  count,
  filter,
  onFilter,
  userName,
  onRefresh,
  refreshing,
  onSignOut,
}: HeaderProps) {
  return (
    <header>
      <span className="wordmark">
        <span className="dot" />
        Approvals Console
      </span>
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
      <span className="who">
        Reviewing as <b>{userName}</b>
        <button className="signout" onClick={onSignOut}>
          Sign out
        </button>
      </span>
    </header>
  );
}
