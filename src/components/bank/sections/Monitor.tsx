import { useEffect, useState } from "react";
import { clearLog, EVENT_LABELS, useMonitorEvents, type EventType } from "@/lib/bank/monitor";
import { SectionHeader } from "../Layout";

const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function since(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function MonitorSection() {
  const events = useMonitorEvents();
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<"all" | EventType>("all");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const count = (t: EventType) => events.filter((e) => e.type === t).length;
  const stats = [
    { label: "Events", value: String(events.length) },
    { label: "Errors", value: String(count("error")) },
    { label: "Transfers", value: String(count("transfer")) },
    { label: "Rejected transfers", value: String(count("transfer_rejected")) },
    { label: "Page views", value: String(count("page_view")) },
    { label: "Last event", value: events[0] ? since(now - events[0].time) : "—" },
  ];
  const shown = filter === "all" ? events : events.filter((e) => e.type === filter);

  return (
    <div className="space-y-6">
      <SectionHeader title="Monitor" subtitle="A live log of what happens in this app session." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="glass reveal min-w-0 p-4">
            <p className="truncate text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 truncate font-display text-xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
      <section className="glass p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="min-w-0 flex-1 sm:max-w-xs">
            <span className="sr-only">Filter by event type</span>
            <select className="field" value={filter} onChange={(e) => setFilter(e.target.value as "all" | EventType)}>
              <option value="all">All event types</option>
              {(Object.keys(EVENT_LABELS) as EventType[]).map((t) => <option key={t} value={t}>{EVENT_LABELS[t]}</option>)}
            </select>
          </label>
          <button className="btn btn-ghost btn-sm" onClick={clearLog}>Clear log</button>
        </div>
        {shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No events to show.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {shown.map((e) => (
              <li key={e.id} className="reveal grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 py-2.5 text-sm">
                <span className={`mt-0.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${e.type === "error" || e.type === "login_failed" || e.type === "transfer_rejected" ? "bg-destructive/20 text-destructive" : "bg-secondary text-accent"}`}>
                  {EVENT_LABELS[e.type]}
                </span>
                <div className="min-w-0">
                  <p className="break-words">{e.message}</p>
                  <p className="text-xs text-muted-foreground">{timeFmt.format(e.time)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
