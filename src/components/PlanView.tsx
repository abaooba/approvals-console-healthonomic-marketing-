import { useCallback, useEffect, useState } from "react";
import {
  approvePlanGroup,
  fetchPlans,
  rejectPlan,
  revisePlan,
} from "../lib/api";
import { badgeClass, formatDateOnly, statusClass } from "../lib/format";
import type { PlanRecord } from "../types";

const PLAN_WEBHOOK =
  "https://kcajas3000.app.n8n.cloud/webhook/plan-quarter-hx3m9v";
const GROUP_HINT =
  "Approved themes are promoted to the Campaign Tracker and drafted 7 days before their scheduled date.";
const STATUS_WORST_FIRST = ["Rejected", "Needs Revision", "Proposed", "Approved"];

interface PlanGroup {
  name: string;
  month: string;
  records: PlanRecord[];
}

function groupPlans(records: PlanRecord[]): PlanGroup[] {
  const groups = new Map<string, PlanRecord[]>();
  for (const record of records) {
    const key = record.campaignGroup || "Ungrouped";
    const bucket = groups.get(key);
    if (bucket) bucket.push(record);
    else groups.set(key, [record]);
  }
  return [...groups.entries()].map(([name, groupRecords]) => ({
    name,
    month: groupRecords.find((record) => record.month)?.month ?? "",
    records: groupRecords,
  }));
}

function worstStatus(records: PlanRecord[]): string {
  for (const status of STATUS_WORST_FIRST) {
    if (records.some((record) => (record.planStatus || "Proposed") === status)) {
      return status;
    }
  }
  return "Proposed";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="pr-field">
      <span className="k">{label}</span>
      {value || "—"}
    </div>
  );
}

interface PlanViewProps {
  pushToast: (
    msg: string,
    sub: string | undefined,
    cls: "ok" | "warn" | "err",
  ) => void;
  // The 90s post-plan refresh timer lives in App so it survives tab switches;
  // it fires by bumping refreshTick, which re-runs load() here.
  refreshTick: number;
  onPlannerStarted: () => void;
}

export default function PlanView({
  pushToast,
  refreshTick,
  onPlannerStarted,
}: PlanViewProps) {
  const [records, setRecords] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [approvingGroup, setApprovingGroup] = useState<string | null>(null);
  const [revise, setRevise] = useState<{ id: string; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlans();
      setRecords(data.records);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      pushToast("Couldn't load the plan", message, "err");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void load();
  }, [load, refreshTick]);

  const planQuarter = useCallback(async () => {
    setPlanning(true);
    try {
      const res = await fetch(PLAN_WEBHOOK, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      pushToast(
        "Planner started.",
        "~15 briefs land here for review in a few minutes.",
        "ok",
      );
      onPlannerStarted();
    } catch {
      pushToast(
        "Planner didn't start (workflow may be inactive in n8n).",
        undefined,
        "err",
      );
    } finally {
      setPlanning(false);
    }
  }, [onPlannerStarted, pushToast]);

  const markBusy = useCallback((ids: string[], busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (busy) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const applyLocal = useCallback(
    (ids: string[], status: string, notes?: string) => {
      setRecords((prev) =>
        prev.map((record) =>
          ids.includes(record.id)
            ? {
                ...record,
                planStatus: status,
                ...(notes !== undefined ? { reviewerNotes: notes } : {}),
              }
            : record,
        ),
      );
    },
    [],
  );

  const errMessage = (err: unknown) =>
    err instanceof Error ? err.message : String(err);

  const approveTheme = async (group: PlanGroup) => {
    const ids = group.records.map((record) => record.id);
    setApprovingGroup(group.name);
    markBusy(ids, true);
    try {
      await approvePlanGroup(ids);
      applyLocal(ids, "Approved");
      pushToast(
        `Theme approved — ${group.name}`,
        `${ids.length} brief${ids.length === 1 ? "" : "s"} set to Approved`,
        "ok",
      );
    } catch (err) {
      pushToast(`Couldn't approve theme — ${group.name}`, errMessage(err), "err");
      // A batch failure can leave part of the theme approved — resync.
      void load();
    } finally {
      setApprovingGroup(null);
      markBusy(ids, false);
    }
  };

  const reject = async (record: PlanRecord) => {
    markBusy([record.id], true);
    try {
      await rejectPlan(record.id);
      applyLocal([record.id], "Rejected");
      pushToast(`Rejected — ${record.campaignName}`, undefined, "warn");
    } catch (err) {
      pushToast(
        `Couldn't reject — ${record.campaignName}`,
        errMessage(err),
        "err",
      );
    } finally {
      markBusy([record.id], false);
    }
  };

  const sendRevision = async (record: PlanRecord) => {
    const note = revise?.id === record.id ? revise.text.trim() : "";
    if (!note) return;
    markBusy([record.id], true);
    try {
      await revisePlan(record.id, note);
      applyLocal([record.id], "Needs Revision", note);
      setRevise((cur) => (cur?.id === record.id ? null : cur));
      pushToast(
        `Sent for revision — ${record.campaignName}`,
        "Note saved to Reviewer Notes",
        "warn",
      );
    } catch (err) {
      pushToast(
        `Couldn't send for revision — ${record.campaignName}`,
        errMessage(err),
        "err",
      );
    } finally {
      markBusy([record.id], false);
    }
  };

  const toggleGroup = (name: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const groups = groupPlans(records);

  return (
    <main className="plan">
      <div className="plan-inner">
        <div className="plan-bar">
          <button
            className="btn btn-plan"
            onClick={() => void planQuarter()}
            disabled={planning}
          >
            {planning ? "Planning…" : "✦ Plan Quarter"}
          </button>
          <button
            className="chip"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "↻ Refreshing…" : "↻ Refresh"}
          </button>
        </div>

        {loading && records.length === 0 ? (
          <div className="empty-queue">Loading plan…</div>
        ) : error && records.length === 0 ? (
          <div className="empty-queue">
            <span className="big">!</span>
            Couldn&rsquo;t load the plan.
            <br />
            {error}
          </div>
        ) : groups.length === 0 ? (
          <div className="empty-queue">
            <span className="big">0</span>
            No plan briefs awaiting review.
            <br />
            Plan Quarter drafts the next quarter&rsquo;s themes.
          </div>
        ) : (
          groups.map((group) => {
            const open = !collapsed.has(group.name);
            const worst = worstStatus(group.records);
            const groupBusy = group.records.some((record) =>
              busyIds.has(record.id),
            );
            return (
              <section className="plan-group" key={group.name}>
                <div className="pg-head" onClick={() => toggleGroup(group.name)}>
                  <span className={`pg-caret${open ? " open" : ""}`}>▸</span>
                  <span className="pg-name">{group.name}</span>
                  {group.month && <span className="pg-month">{group.month}</span>}
                  <span className="pg-count">
                    {group.records.length} brief
                    {group.records.length === 1 ? "" : "s"}
                  </span>
                  <span className={`st-badge ${statusClass(worst)}`}>{worst}</span>
                  <button
                    className="pg-approve"
                    disabled={groupBusy}
                    onClick={(event) => {
                      event.stopPropagation();
                      void approveTheme(group);
                    }}
                  >
                    {approvingGroup === group.name
                      ? "Approving…"
                      : "✓ Approve Theme"}
                  </button>
                </div>
                <div className="pg-hint">{GROUP_HINT}</div>
                {open && (
                  <>
                    {group.records.map((record) => {
                      const rowOpen = expandedRows.has(record.id);
                      const busy = busyIds.has(record.id);
                      return (
                        <div className="plan-row" key={record.id}>
                          <div
                            className="pr-main"
                            onClick={() => toggleRow(record.id)}
                          >
                            <span className={`pg-caret${rowOpen ? " open" : ""}`}>
                              ▸
                            </span>
                            <span
                              className={`ch-badge ${badgeClass(record.channel)}`}
                            >
                              {record.channel || "—"}
                            </span>
                            <span className="pr-name">
                              {record.campaignName || "Untitled brief"}
                            </span>
                            <span className="pr-date">
                              {formatDateOnly(record.scheduledDate)}
                            </span>
                            <span
                              className={`st-badge ${statusClass(record.planStatus)}`}
                            >
                              {record.planStatus || "Proposed"}
                            </span>
                          </div>
                          {rowOpen && (
                            <div className="pr-detail">
                              <DetailRow
                                label="Brief / Objective"
                                value={record.briefObjective}
                              />
                              <DetailRow
                                label="Key messaging"
                                value={record.keyMessaging}
                              />
                              <DetailRow
                                label="Target keyword"
                                value={record.targetKeyword}
                              />
                              {record.gbpLocation && (
                                <DetailRow
                                  label="GBP location"
                                  value={record.gbpLocation}
                                />
                              )}
                              <DetailRow
                                label="Rationale"
                                value={record.rationale}
                              />
                              {record.reviewerNotes && (
                                <DetailRow
                                  label="Reviewer notes"
                                  value={record.reviewerNotes}
                                />
                              )}
                              <div className="pr-actions">
                                <button
                                  className="pr-btn pr-reject"
                                  disabled={busy}
                                  onClick={() => void reject(record)}
                                >
                                  ✕ Reject
                                </button>
                                <button
                                  className="pr-btn pr-revise"
                                  disabled={busy}
                                  onClick={() =>
                                    setRevise((cur) =>
                                      cur?.id === record.id
                                        ? null
                                        : { id: record.id, text: "" },
                                    )
                                  }
                                >
                                  ↩ Needs Revision
                                </button>
                              </div>
                              {revise !== null && revise.id === record.id && (
                                <div className="pr-note">
                                  <textarea
                                    className="notes pr-note-input"
                                    value={revise.text}
                                    onChange={(event) =>
                                      setRevise((cur) =>
                                        cur
                                          ? { ...cur, text: event.target.value }
                                          : cur,
                                      )
                                    }
                                    placeholder="What should change? Lands in Reviewer Notes."
                                    autoFocus
                                  />
                                  <button
                                    className="pr-btn pr-note-save"
                                    disabled={busy || !revise.text.trim()}
                                    onClick={() => void sendRevision(record)}
                                  >
                                    Save
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}
