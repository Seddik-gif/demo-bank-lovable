import { useEffect, useMemo, useRef, useState } from "react";
import { Eraser, Activity } from "lucide-react";
import { clearLog, EVENT_LABELS, useMonitorEvents, type EventType } from "@/lib/bank/monitor";
import { mouseDragHandlers } from "@/lib/bank/dragScroll";
import { SectionHeader } from "../Layout";

const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function since(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

/** Problems: red. Money movements: green. Everything else: the accent colour. */
const PROBLEM: EventType[] = ["error", "login_failed", "transfer_rejected", "trade_rejected", "payment_rejected"];
const MONEY: EventType[] = ["transfer", "payment", "trade", "deposit"];
function toneOf(t: EventType): "bad" | "good" | "plain" {
  if (PROBLEM.includes(t)) return "bad";
  if (MONEY.includes(t)) return "good";
  return "plain";
}
const DOT: Record<"bad" | "good" | "plain", string> = {
  bad: "bg-destructive shadow-[0_0_12px_-2px_var(--color-destructive)]",
  good: "bg-success shadow-[0_0_12px_-2px_var(--color-success)]",
  plain: "bg-accent shadow-[0_0_12px_-2px_var(--accent)]",
};
const CHIP_TONE: Record<"bad" | "good" | "plain", string> = {
  bad: "text-destructive",
  good: "text-success",
  plain: "text-accent",
};

export function MonitorSection() {
  const events = useMonitorEvents();
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<"all" | EventType>("all");
  const chips = useRef<HTMLDivElement>(null);
  const [drag] = useState(() => mouseDragHandlers(() => chips.current));

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const counts = useMemo(() => {
    const map = new Map<EventType, number>();
    for (const e of events) map.set(e.type, (map.get(e.type) ?? 0) + 1);
    return map;
  }, [events]);
  const count = (t: EventType) => counts.get(t) ?? 0;
  const errors = PROBLEM.reduce((n, t) => n + count(t), 0);
  const shown = filter === "all" ? events : events.filter((e) => e.type === filter);
  const types = (Object.keys(EVENT_LABELS) as EventType[]).filter((t) => count(t) > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <SectionHeader title="Monitor" subtitle="A live log of what happens in this app session." />
        <span className="mt-1 inline-flex shrink-0 items-center gap-2 rounded-full bg-background/30 px-3 py-1 text-xs font-semibold ring-1 ring-white/15">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Live
        </span>
      </div>

      {/* Summary tiles. Errors light up red when there are any. */}
      <div className="grid grid-cols-3 gap-3">
        <Tile label="Events" value={String(events.length)} />
        <Tile label="Errors" value={String(errors)} tone={errors > 0 ? "bad" : "plain"} />
        <Tile label="Last event" value={events[0] ? since(now - events[0].time) : "None yet"} />
      </div>

      {/* Filters: one chip per event type that has happened, plus All. Swipe them with the mouse. */}
      <div ref={chips} {...drag} className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter events">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={events.length} tone="plain" />
        {types.map((t) => (
          <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)} label={EVENT_LABELS[t]} count={count(t)} tone={toneOf(t)} />
        ))}
      </div>

      <section className="glass p-5" aria-label="Event log">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-accent" aria-hidden /> {shown.length} {shown.length === 1 ? "event" : "events"}
          </p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearLog} disabled={events.length === 0}>
            <Eraser className="h-3.5 w-3.5" aria-hidden /> Clear log
          </button>
        </div>

        {shown.length === 0 ? (
          <div className="grid place-items-center gap-2 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-accent">
              <Activity className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-sm font-medium">Nothing here yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">Use the app and every step shows up here: payments, transfers, trades and sign-ins.</p>
          </div>
        ) : (
          <ol className="relative space-y-0">
            {/* The rail that joins the dots. */}
            <span className="absolute bottom-2 left-[5px] top-2 w-px bg-border" aria-hidden />
            {shown.map((e) => {
              const tone = toneOf(e.type);
              return (
                <li key={e.id} className="reveal relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 py-3">
                  <span className={`relative z-10 mt-1.5 h-3 w-3 rounded-full ring-4 ring-background ${DOT[tone]}`} aria-hidden />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-semibold uppercase tracking-wide ${CHIP_TONE[tone]}`}>{EVENT_LABELS[e.type]}</span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">{timeFmt.format(e.time)}</span>
                    </div>
                    <p className="break-words text-sm leading-relaxed">{e.message}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value, tone = "plain" }: { label: string; value: string; tone?: "bad" | "good" | "plain" }) {
  return (
    <div className="glass min-w-0 p-4">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate font-display text-xl font-semibold tabular-nums ${tone === "bad" ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}

function FilterChip({ active, onClick, label, count, tone }: { active: boolean; onClick: () => void; label: string; count: number; tone: "bad" | "good" | "plain" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`snap-start shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-accent-gradient text-primary-foreground" : `bg-secondary hover:bg-input ${CHIP_TONE[tone]}`
      }`}
    >
      {label} <span className="ml-1 tabular-nums opacity-80">{count}</span>
    </button>
  );
}
