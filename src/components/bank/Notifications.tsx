import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownLeft, ArrowUpRight, Ban, Bell, Clock, X } from "lucide-react";
import { markAllRead, useNotices, type Notice } from "@/lib/bank/notifications";

const ICON = {
  in: { Icon: ArrowDownLeft, className: "text-success" },
  out: { Icon: ArrowUpRight, className: "text-accent" },
  blocked: { Icon: Ban, className: "text-destructive" },
  pending: { Icon: Clock, className: "text-muted-foreground" },
} as const;

const timeLabel = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

function Row({ n }: { n: Notice }) {
  const { Icon, className } = ICON[n.tone];
  return (
    <li className="flex gap-3 py-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary ${className}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{n.title}</p>
        <p className="break-words text-sm text-muted-foreground">{n.body}</p>
        <p className="text-xs text-muted-foreground">{timeLabel(n.time)}</p>
      </div>
    </li>
  );
}

/** Bell with an unread count, and a window that lists the notices. Opening the window and closing it marks them read. */
export function NotificationBell() {
  const { items } = useNotices();
  const [open, setOpen] = useState(false);
  const unread = items.filter((n) => !n.read).length;

  const close = () => {
    setOpen(false);
    markAllRead();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // close only changes identity with open, so this stays in step with the window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm relative shrink-0"
        onClick={() => setOpen(true)}
        aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-primary-foreground tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Notifications">
            <button className="fade-in absolute inset-0 bg-background/70" aria-label="Close notifications" onClick={close} />
            <div className="glass page-fade relative flex max-h-[80vh] w-full max-w-md flex-col rounded-b-none p-6 pb-8 sm:rounded-3xl">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Notifications</h2>
                <button className="btn btn-ghost btn-sm" onClick={close} aria-label="Close"><X className="h-4 w-4" aria-hidden /></button>
              </div>
              {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No notifications yet. Payments and money received show up here.</p>
              ) : (
                <ul className="divide-y divide-border overflow-y-auto overscroll-contain">
                  {items.map((n) => <Row key={n.id} n={n} />)}
                </ul>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** A short pop-up for the newest notice. It disappears by itself. */
export function NoticeToast() {
  const { toast } = useNotices();
  if (!toast) return null;
  const { Icon, className } = ICON[toast.tone];
  return createPortal(
    <div key={toast.id} role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex justify-center px-4">
      <div className="tour-bubble flex w-full max-w-sm items-center gap-3 rounded-2xl border border-border bg-popover px-4 py-3 shadow-2xl">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary ${className}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{toast.title}</p>
          <p className="truncate text-xs text-muted-foreground">{toast.body}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
