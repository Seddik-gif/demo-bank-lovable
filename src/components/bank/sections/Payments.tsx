import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Plus, Receipt, Send, Wallet } from "lucide-react";
import {
  formatMoney,
  initials,
  MAX_MESSAGE_LENGTH,
  MAX_NOTE_LENGTH,
  round2,
  validatePayment,
  validateRequest,
  validateRequestPayment,
  type BankState,
  type ChatMessage,
  type Contact,
  type ContactGroup,
  type PaymentSplit,
  type RequestStatus,
} from "@/lib/bank/data";
import { useBank } from "@/lib/bank/store";
import { useSettings } from "@/lib/bank/settings";
import { Money, useMoneyText } from "../Money";
import { SectionHeader } from "../Layout";

const GROUPS: ContactGroup[] = ["Friends", "Family", "Work"];
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

const lastTimeLabel = (iso: string) => {
  const d = new Date(iso);
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay ? timeFmt.format(d) : dayFmt.format(d);
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  declined: "Declined",
  cancelled: "Cancelled",
};

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span className={`bg-accent-gradient grid shrink-0 place-items-center rounded-full font-semibold text-primary-foreground ${size === "md" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs"}`} aria-hidden>
      {initials(name) || "?"}
    </span>
  );
}

function AddContactForm({ onDone }: { onDone: () => void }) {
  const { addContact } = useBank();
  const [name, setName] = useState("");
  const [group, setGroup] = useState<ContactGroup>("Friends");
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const res = addContact(name, group);
    if (res.ok) onDone();
    else setError(res.error);
  };

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl bg-secondary p-3">
      <label className="block space-y-1 text-xs">
        <span className="text-muted-foreground">Name</span>
        <input className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jordan Smith" autoFocus />
      </label>
      <label className="block space-y-1 text-xs">
        <span className="text-muted-foreground">Group</span>
        <select className="field" value={group} onChange={(e) => setGroup(e.target.value as ContactGroup)}>
          {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </label>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm">Save contact</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
      </div>
      {error && <p role="alert" className="text-xs font-medium text-destructive">{error}</p>}
    </form>
  );
}

function ContactList({ contacts, messages, selectedId, onSelect }: { contacts: Contact[]; messages: ChatMessage[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const [adding, setAdding] = useState(false);
  const lastMessage = (id: string) => [...messages].filter((m) => m.contactId === id).sort((a, b) => a.time.localeCompare(b.time)).at(-1);
  const pendingCount = (id: string) => messages.filter((m) => m.contactId === id && m.request?.direction === "incoming" && m.request.status === "pending").length;
  const fmt = useMoneyText();

  const previewOf = (m: ChatMessage | undefined) => {
    if (!m) return "No messages yet";
    if (m.request) return `Request ${fmt(m.request.amount)} · ${STATUS_LABEL[m.request.status]}`;
    if (m.payment) return `Payment ${fmt(m.payment.amount)}`;
    return m.text;
  };

  return (
    <section className="glass p-4" aria-labelledby="contacts-title">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="contacts-title" className="text-lg font-semibold">Contacts</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
          <Plus className="h-4 w-4" aria-hidden /> Add
        </button>
      </div>
      {adding && <div className="mb-3"><AddContactForm onDone={() => setAdding(false)} /></div>}

      {GROUPS.map((group) => {
        const members = contacts.filter((c) => c.group === group).sort((a, b) => a.name.localeCompare(b.name));
        if (members.length === 0) return null;
        return (
          <div key={group} className="mb-3">
            <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
            <ul className="space-y-1">
              {members.map((c) => {
                const active = c.id === selectedId;
                const pending = pendingCount(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors ${active ? "bg-secondary ring-1 ring-accent" : "hover:bg-secondary"}`}
                    >
                      <Avatar name={c.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{c.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{previewOf(lastMessage(c.id))}</span>
                      </span>
                      {pending > 0 && (
                        <span className="shrink-0 rounded-full bg-accent-gradient px-2 py-0.5 text-[11px] font-semibold text-primary-foreground" aria-label={`${pending} pending request${pending === 1 ? "" : "s"}`}>
                          {pending}
                        </span>
                      )}
                      {lastMessage(c.id) && <span className="shrink-0 text-[11px] text-muted-foreground">{lastTimeLabel(lastMessage(c.id)!.time)}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

/** Pay a contact, or pay one of their requests (the amount then must match the request exactly). */
function PaymentPanel({ contact, request, onClose }: { contact: Contact; request?: { messageId: string; amount: number }; onClose: () => void }) {
  const { accounts, contacts, messages, sendPayment, payRequest } = useBank();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const { confirmPayments, defaultAccountId } = useSettings();
  const fmt = useMoneyText();
  // The default account is listed first.
  // Crypto wallets hold no cash, so they cannot pay out.
  const payable = accounts.filter((a) => a.kind !== "crypto");
  const ordered = [...payable].sort((a, b) => Number(b.id === defaultAccountId) - Number(a.id === defaultAccountId));

  const splits: PaymentSplit[] = payable.map((a) => {
    const raw = amounts[a.id] ?? "";
    return { accountId: a.id, amount: raw.trim() === "" ? 0 : Number(raw) };
  });
  const total = round2(splits.reduce((sum, s) => sum + (Number.isFinite(s.amount) && s.amount > 0 ? s.amount : 0), 0));

  // Same rules as the store, so the preview matches what is checked on send.
  const state = { accounts, contacts, messages } as BankState;
  const check = request
    ? validateRequestPayment(state, request.messageId, splits, note)
    : validatePayment(state, contact.id, splits, note);
  const blocker = check.ok ? "" : check.error;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (blocker) return;
    if (confirmPayments && !confirming) {
      setConfirming(true);
      return;
    }
    const res = request ? payRequest(request.messageId, splits, note) : sendPayment(contact.id, splits, note);
    if (res.ok) onClose();
    else setError(res.error);
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-secondary p-4" aria-labelledby="pay-title">
      <div className="flex items-center justify-between gap-2">
        <h3 id="pay-title" className="flex items-center gap-2 font-semibold"><Wallet className="h-4 w-4" aria-hidden /> {request ? `Pay ${contact.name}’s request` : `Pay ${contact.name}`}</h3>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
      </div>
      {request ? (
        <p className="text-xs text-muted-foreground">They asked for <Money value={request.amount} className="font-semibold text-foreground" />. Split it across the accounts you choose.</p>
      ) : (
        <p className="text-xs text-muted-foreground">Choose how much to take from each account. Leave an account empty to skip it.</p>
      )}

      <ul className="space-y-2">
        {ordered.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-xl bg-background/40 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{a.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums">Available <Money value={a.balance} /></p>
            </div>
            <label className="w-28 shrink-0">
              <span className="sr-only">Amount from {a.name}</span>
              <input
                className="field text-right tabular-nums"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={amounts[a.id] ?? ""}
                onChange={(e) => {
                  setAmounts((prev) => ({ ...prev, [a.id]: e.target.value }));
                  setConfirming(false);
                }}
              />
            </label>
          </li>
        ))}
      </ul>

      <label className="block space-y-1 text-xs">
        <span className="text-muted-foreground">Note (optional)</span>
        <input className="field" value={note} maxLength={MAX_NOTE_LENGTH} onChange={(e) => setNote(e.target.value)} placeholder="What is it for?" />
      </label>

      <div className="flex items-center justify-between rounded-xl bg-background/40 p-3 text-sm">
        <span className="text-muted-foreground">Total</span>
        <Money value={total} className="font-semibold tabular-nums" />
      </div>

      {blocker && <p className="text-xs text-muted-foreground" role="status">{blocker}</p>}
      {error && <p role="alert" className="text-xs font-medium text-destructive">{error}</p>}

      <button type="submit" disabled={!!blocker} className="btn btn-primary w-full disabled:opacity-50">
        <Send className="h-4 w-4" aria-hidden /> {confirming ? `Tap again to confirm ${fmt(total)}` : `Send ${fmt(total)}`}
      </button>
    </form>
  );
}

/** Ask a contact to pay you. */
function RequestPanel({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const { accounts, contacts, messages, requestMoney } = useBank();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const value = amount.trim() === "" ? NaN : Number(amount);
  const check = validateRequest({ accounts, contacts, messages } as BankState, contact.id, value, note);
  const blocker = check.ok ? "" : check.error;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (blocker) return;
    const res = requestMoney(contact.id, value, note);
    if (res.ok) onClose();
    else setError(res.error);
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-secondary p-4" aria-labelledby="request-title">
      <div className="flex items-center justify-between gap-2">
        <h3 id="request-title" className="flex items-center gap-2 font-semibold"><Receipt className="h-4 w-4" aria-hidden /> Request from {contact.name}</h3>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
      </div>
      <p className="text-xs text-muted-foreground">They will see your request in the chat. It stays pending until you cancel it.</p>
      <label className="block space-y-1 text-xs">
        <span className="text-muted-foreground">Amount (USD)</span>
        <input className="field tabular-nums" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <label className="block space-y-1 text-xs">
        <span className="text-muted-foreground">Note (optional)</span>
        <input className="field" value={note} maxLength={MAX_NOTE_LENGTH} onChange={(e) => setNote(e.target.value)} placeholder="What is it for?" />
      </label>
      {blocker && <p className="text-xs text-muted-foreground" role="status">{blocker}</p>}
      {error && <p role="alert" className="text-xs font-medium text-destructive">{error}</p>}
      <button type="submit" disabled={!!blocker} className="btn btn-primary w-full disabled:opacity-50">
        <Receipt className="h-4 w-4" aria-hidden /> Send request
      </button>
    </form>
  );
}

function RequestCard({ m, contact, onPay, onRespond }: { m: ChatMessage; contact: Contact; onPay: () => void; onRespond: (status: "declined" | "cancelled") => void }) {
  const req = m.request!;
  const incoming = req.direction === "incoming";
  const pending = req.status === "pending";
  const statusTone = req.status === "paid" ? "text-success" : req.status === "pending" ? "text-accent" : "text-muted-foreground";
  return (
    <div className="space-y-2">
      <p className="font-semibold tabular-nums">
        {incoming ? `${contact.name} requested` : "You requested"} <Money value={req.amount} />
      </p>
      {m.text && <p className="text-xs opacity-90">“{m.text}”</p>}
      <p className={`text-xs font-semibold ${statusTone}`}>{STATUS_LABEL[req.status]}</p>
      {pending && incoming && (
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn btn-primary btn-sm" onClick={onPay}>Pay</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRespond("declined")}>Decline</button>
        </div>
      )}
      {pending && !incoming && (
        <div className="pt-1">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRespond("cancelled")}>Cancel request</button>
        </div>
      )}
    </div>
  );
}

function Bubble({ m, contact, onPay, onRespond }: { m: ChatMessage; contact: Contact; onPay: () => void; onRespond: (status: "declined" | "cancelled") => void }) {
  const mine = m.from === "me";
  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "bg-accent-gradient text-primary-foreground" : "glass"}`}>
        {m.request ? (
          <RequestCard m={m} contact={contact} onPay={onPay} onRespond={onRespond} />
        ) : m.payment ? (
          <div className="space-y-1">
            <p className="font-semibold tabular-nums">{mine ? "You sent" : `${contact.name} sent`} <Money value={m.payment.amount} /></p>
            <ul className="space-y-0.5 text-xs opacity-90">
              {m.payment.splits.map((s) => (
                <li key={s.accountId} className="flex justify-between gap-3 tabular-nums">
                  <span>from {s.accountName}</span>
                  <Money value={s.amount} />
                </li>
              ))}
            </ul>
            {m.text && <p className="pt-1 text-xs opacity-90">“{m.text}”</p>}
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words">{m.text}</p>
        )}
        <p className={`mt-1 text-[10px] tabular-nums ${mine ? "opacity-80" : "text-muted-foreground"}`}>{timeFmt.format(new Date(m.time))}</p>
      </div>
    </li>
  );
}

function ChatPane({ contact, onBack }: { contact: Contact; onBack: () => void }) {
  const { messages, sendMessage, respondToRequest } = useBank();
  const thread = useMemo(
    () => messages.filter((m) => m.contactId === contact.id).sort((a, b) => a.time.localeCompare(b.time)),
    [messages, contact.id],
  );
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<"pay" | "request" | null>(null);
  const [payingFor, setPayingFor] = useState<{ messageId: string; amount: number } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.length, contact.id]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const res = sendMessage(contact.id, text);
    if (res.ok) {
      setText("");
      setError("");
    } else setError(res.error);
  };

  const respond = (messageId: string, status: "declined" | "cancelled") => {
    const res = respondToRequest(messageId, status);
    if (!res.ok) setError(res.error);
  };

  const openPanel = (next: "pay" | "request") => {
    setPayingFor(null);
    setPanel((cur) => (cur === next ? null : next));
  };

  return (
    <section className="glass flex min-h-[32rem] flex-col overflow-hidden" aria-label={`Chat with ${contact.name}`}>
      <header className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <button type="button" className="btn btn-ghost btn-sm desk:hidden" onClick={onBack} aria-label="Back to contacts">
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <Avatar name={contact.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{contact.name}</p>
          <p className="text-xs text-muted-foreground">{contact.group}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openPanel("request")} aria-expanded={panel === "request"}>
            <Receipt className="h-4 w-4" aria-hidden /> Request
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => openPanel("pay")} aria-expanded={panel === "pay"}>
            <Wallet className="h-4 w-4" aria-hidden /> Pay
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite">
        {thread.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Say hello below.</p>}
        <ul className="space-y-3">
          {thread.map((m) => (
            <Bubble
              key={m.id}
              m={m}
              contact={contact}
              onPay={() => { setPanel(null); setPayingFor({ messageId: m.id, amount: m.request?.amount ?? 0 }); }}
              onRespond={(status) => respond(m.id, status)}
            />
          ))}
        </ul>
        <div ref={endRef} />
      </div>

      {(panel || payingFor) && (
        <div className="border-t border-border p-4">
          {panel === "pay" && <PaymentPanel contact={contact} onClose={() => setPanel(null)} />}
          {panel === "request" && <RequestPanel contact={contact} onClose={() => setPanel(null)} />}
          {payingFor && !panel && (
            <PaymentPanel contact={contact} request={payingFor} onClose={() => setPayingFor(null)} />
          )}
        </div>
      )}

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-border p-3">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Message {contact.name}</span>
          <input className="field" value={text} maxLength={MAX_MESSAGE_LENGTH} onChange={(e) => setText(e.target.value)} placeholder={`Message ${contact.name}`} />
        </label>
        <button type="submit" className="btn btn-primary btn-sm shrink-0" disabled={!text.trim()}>
          <Send className="h-4 w-4" aria-hidden /> Send
        </button>
      </form>
      {error && <p role="alert" className="px-4 pb-3 text-xs font-medium text-destructive">{error}</p>}
    </section>
  );
}

export function PaymentsSection() {
  const { contacts, messages } = useBank();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <SectionHeader title="Payments" subtitle="Your contacts, chats, requests, and money transfers." />
      <div className="grid gap-4 desk:grid-cols-[18rem_minmax(0,1fr)]">
        <div className={`${selected ? "hidden" : "block"} desk:block`}>
          <ContactList contacts={contacts} messages={messages} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className={`${selected ? "block" : "hidden"} desk:block`}>
          {selected ? (
            <ChatPane key={selected.id} contact={selected} onBack={() => setSelectedId(null)} />
          ) : (
            <div className="glass flex min-h-[32rem] flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="font-semibold">Choose a contact</p>
              <p className="text-sm text-muted-foreground">Open a chat to message someone, send money, or request it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
