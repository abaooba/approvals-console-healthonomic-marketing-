import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConfirmModal from "./components/ConfirmModal";
import ContextRail from "./components/ContextRail";
import Header, { type Tab } from "./components/Header";
import PlanView from "./components/PlanView";
import Queue from "./components/Queue";
import Stage from "./components/Stage";
import Toasts, { type ToastData } from "./components/Toasts";
import { fetchQueue, sendDecision } from "./lib/api";
import { publisherFor, truncateTitle } from "./lib/format";
import type { DecisionAction, QueueRecord } from "./types";

const LEAVE_MS = 360;
const REVIEWER_KEY = "reviewerName";
const PLAN_REFRESH_MS = 90_000;
const GENERATE_WEBHOOK =
  "https://kcajas3000.app.n8n.cloud/webhook/marketing-agent-hx3m9v";

export default function App() {
  const [tab, setTab] = useState<Tab>("approvals");
  const [records, setRecords] = useState<QueueRecord[]>([]);
  const [entity, setEntity] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filter, setFilter] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());
  const [leavingIds, setLeavingIds] = useState<ReadonlySet<string>>(new Set());

  const [notes, setNotes] = useState("");
  const [notesErr, setNotesErr] = useState(false);
  const [focusNotesTick, setFocusNotesTick] = useState(0);

  const [confirmRecord, setConfirmRecord] = useState<QueueRecord | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [generating, setGenerating] = useState(false);

  // The Plan Quarter auto-refresh timer lives here (not in PlanView) so it
  // survives tab switches; PlanView reloads whenever the tick bumps.
  const [planRefreshTick, setPlanRefreshTick] = useState(0);
  const planTimer = useRef<number | null>(null);
  const schedulePlanRefresh = useCallback(() => {
    if (planTimer.current) window.clearTimeout(planTimer.current);
    planTimer.current = window.setTimeout(
      () => setPlanRefreshTick((tick) => tick + 1),
      PLAN_REFRESH_MS,
    );
  }, []);

  const [reviewerName, setReviewerName] = useState(() => {
    try {
      return localStorage.getItem(REVIEWER_KEY) ?? "";
    } catch {
      return "";
    }
  });

  const updateReviewerName = useCallback((value: string) => {
    setReviewerName(value);
    try {
      localStorage.setItem(REVIEWER_KEY, value);
    } catch {
      // storage unavailable — the name just won't persist across visits
    }
  }, []);

  const cardEls = useRef(new Map<string, HTMLDivElement>());
  const inFlightIds = useRef(new Set<string>());
  const toastSeq = useRef(0);

  const pushToast = useCallback(
    (msg: string, sub: string | undefined, cls: ToastData["cls"]) => {
      toastSeq.current += 1;
      const toast = { id: toastSeq.current, msg, sub, cls };
      setToasts((prev) => [...prev, toast]);
    },
    [],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchQueue();
      setRecords(data.records);
      setEntity(data.entity);
      // Keep only decisions still awaiting their API response hidden.
      setHiddenIds(
        (prev) => new Set([...prev].filter((id) => inFlightIds.current.has(id))),
      );
      setLeavingIds(
        (prev) => new Set([...prev].filter((id) => inFlightIds.current.has(id))),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadError(message);
      pushToast("Couldn't load the queue", message, "err");
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  }, [pushToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const generateCampaigns = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(GENERATE_WEBHOOK, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      pushToast(
        "Marketing Agent started.",
        "Drafts will appear in the queue in ~1-2 minutes.",
        "ok",
      );
    } catch {
      pushToast(
        "Agent didn't start (workflow may be inactive in n8n).",
        "Try again or check n8n.",
        "err",
      );
    } finally {
      setGenerating(false);
    }
  }, [pushToast]);

  const pending = useMemo(
    () => records.filter((record) => !hiddenIds.has(record.id)),
    [records, hiddenIds],
  );
  const visible = useMemo(
    () =>
      pending.filter(
        (record) => filter === "All" || record.channel === filter,
      ),
    [pending, filter],
  );
  const selected = visible.find((record) => record.id === selectedId) ?? null;

  const selectRecord = useCallback(
    (id: string | null) => {
      if (id === selectedId) return;
      setSelectedId(id);
      setNotes("");
      setNotesErr(false);
    },
    [selectedId],
  );

  useEffect(() => {
    if (visible.length === 0) {
      if (selectedId !== null) selectRecord(null);
      return;
    }
    if (!visible.some((record) => record.id === selectedId)) {
      selectRecord(visible[0].id);
    }
  }, [visible, selectedId, selectRecord]);

  const decide = useCallback(
    async (
      record: QueueRecord,
      action: DecisionAction,
      noteText: string,
      wasSelected: boolean,
    ) => {
      if (inFlightIds.current.has(record.id)) return;
      inFlightIds.current.add(record.id);
      setDecidingId(record.id);

      // Animate the card out exactly like the mockup: freeze its height,
      // then let .leaving collapse it.
      let rolledBack = false;
      const el = cardEls.current.get(record.id);
      if (el) el.style.maxHeight = `${el.offsetHeight}px`;
      requestAnimationFrame(() => {
        if (rolledBack) return;
        setLeavingIds((prev) => new Set(prev).add(record.id));
      });
      const hideTimer = window.setTimeout(() => {
        setLeavingIds((prev) => {
          const next = new Set(prev);
          next.delete(record.id);
          return next;
        });
        setHiddenIds((prev) => new Set(prev).add(record.id));
      }, LEAVE_MS);

      try {
        const response = await sendDecision(
          record.id,
          action,
          noteText,
          reviewerName.trim(),
        );
        if (action === "approve") {
          pushToast(
            `Approved — ${truncateTitle(record.title)}`,
            `Status → Approved · webhook fires ${publisherFor(record.channel)}`,
            "ok",
          );
        } else {
          pushToast(
            `Sent back — ${truncateTitle(record.title)}`,
            response.webhook_fired === false
              ? "Comment saved, but the revision webhook didn't fire — n8n picks it up on its next run."
              : "Sent back for revision — the agent will redraft.",
            "warn",
          );
        }
        await refresh();
        inFlightIds.current.delete(record.id);
      } catch (err) {
        rolledBack = true;
        window.clearTimeout(hideTimer);
        inFlightIds.current.delete(record.id);
        setLeavingIds((prev) => {
          const next = new Set(prev);
          next.delete(record.id);
          return next;
        });
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(record.id);
          return next;
        });
        if (el) el.style.maxHeight = "";
        // Put the reviewer back where they were: the auto-select effect may
        // have moved selection (and wiped the notes) while the card was hidden.
        if (wasSelected) {
          setSelectedId(record.id);
          setNotes(noteText);
          setNotesErr(false);
        }
        const message = err instanceof Error ? err.message : String(err);
        pushToast(
          `${action === "approve" ? "Approve" : "Send back"} failed — ${truncateTitle(record.title)}`,
          message,
          "err",
        );
      } finally {
        setDecidingId((cur) => (cur === record.id ? null : cur));
      }
    },
    [pushToast, refresh, reviewerName],
  );

  const requestApprove = useCallback(
    (record: QueueRecord) => {
      if (record.channel === "GBP Post") {
        setConfirmRecord(record);
        return;
      }
      void decide(
        record,
        "approve",
        record.id === selectedId ? notes.trim() : "",
        record.id === selectedId,
      );
    },
    [decide, notes, selectedId],
  );

  const requestSendBack = useCallback(
    (record: QueueRecord) => {
      const note = record.id === selectedId ? notes.trim() : "";
      if (!note) {
        setSelectedId(record.id);
        setNotes("");
        setNotesErr(true);
        setFocusNotesTick((tick) => tick + 1);
        return;
      }
      void decide(record, "revise", note, true);
    },
    [decide, notes, selectedId],
  );

  const confirmApprove = useCallback(() => {
    if (!confirmRecord) return;
    const record = confirmRecord;
    setConfirmRecord(null);
    void decide(
      record,
      "approve",
      record.id === selectedId ? notes.trim() : "",
      record.id === selectedId,
    );
  }, [confirmRecord, decide, notes, selectedId]);

  return (
    <>
      <div className="shell">
        <Header
          tab={tab}
          onTab={setTab}
          count={pending.length}
          filter={filter}
          onFilter={setFilter}
          reviewerName={reviewerName}
          onReviewerName={updateReviewerName}
          onRefresh={() => void refresh()}
          refreshing={loading}
        />
        {tab === "plan" ? (
          <PlanView
            pushToast={pushToast}
            refreshTick={planRefreshTick}
            onPlannerStarted={schedulePlanRefresh}
            reviewerName={reviewerName.trim()}
          />
        ) : (
        <div className="cols">
          <Queue
            entity={entity}
            records={visible}
            filter={filter}
            loading={loading && !loadedOnce}
            generating={generating}
            onGenerate={() => void generateCampaigns()}
            selectedId={selectedId}
            leavingIds={leavingIds}
            onSelect={selectRecord}
            onApprove={requestApprove}
            onSendBack={requestSendBack}
            registerCard={(id, el) => {
              if (el) cardEls.current.set(id, el);
              else cardEls.current.delete(id);
            }}
          />
          <Stage
            record={selected}
            loading={loading && !loadedOnce}
            error={loadError}
            entity={entity}
          />
          <ContextRail
            record={selected}
            notes={notes}
            notesErr={notesErr}
            focusTick={focusNotesTick}
            busy={selected !== null && decidingId === selected.id}
            onNotesChange={(value) => {
              setNotes(value);
              if (notesErr) setNotesErr(false);
            }}
            onApprove={() => selected && requestApprove(selected)}
            onSendBack={() => selected && requestSendBack(selected)}
          />
        </div>
        )}
      </div>
      {confirmRecord && (
        <ConfirmModal
          onConfirm={confirmApprove}
          onCancel={() => setConfirmRecord(null)}
        />
      )}
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
