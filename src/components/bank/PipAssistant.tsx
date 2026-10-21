import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";
import { answerQuestion, SUGGESTIONS, type Answer } from "@/lib/bank/assistant";
import type { SectionId } from "@/lib/bank/data";
import { Pip } from "./Welcome";
import { playSound } from "@/lib/bank/sounds";

interface Message extends Partial<Answer> {
  from: "me" | "pip";
  text: string;
}

const GREETING: Message = { from: "pip", text: "Hi! I'm Pip. Ask me anything about the app." };

/** Pip on the home screen. Tap him to hop and open a chat about how the app works. */
export function PipAssistant({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const [open, setOpen] = useState(false);
  const [hop, setHop] = useState(0);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const endRef = useRef<HTMLDivElement>(null);

  const openChat = () => {
    setHop((h) => h + 1);
    setOpen(true);
    playSound("pip");
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || typing) return;
    setMessages((m) => [...m, { from: "me", text: q }]);
    setDraft("");
    setTyping(true);
    // A short pause so the answer feels like Pip is thinking.
    timer.current = window.setTimeout(() => {
      setMessages((m) => [...m, { from: "pip", ...answerQuestion(q) }]);
      setTyping(false);
    }, 600);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(draft);
  };

  const goTo = (id: SectionId) => {
    setOpen(false);
    onNavigate(id);
  };

  return (
    <>
      {/* Portaled to <body>: an animated ancestor would otherwise turn the fixed position into a page-relative one. */}
      {createPortal(
        <button
          type="button"
          onClick={openChat}
          aria-label="Open Pip, your guide"
          className="fixed bottom-24 right-4 z-40 grid h-16 w-16 place-items-center rounded-full bg-secondary/80 shadow-xl backdrop-blur desk:bottom-6 desk:right-6"
        >
          <span key={hop} className={`block h-14 w-14 ${hop ? "pip-hop" : ""}`}>
            <Pip waving className="h-full w-full" />
          </span>
        </button>,
        document.body,
      )}

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Chat with Pip">
            <button className="fade-in absolute inset-0 bg-background/60 backdrop-blur-sm" aria-label="Close chat" onClick={() => setOpen(false)} />
            <div className="glass page-fade relative flex max-h-[80vh] w-full max-w-md flex-col rounded-b-none sm:rounded-3xl">
              <div className="flex items-center gap-3 border-b border-border p-4">
                <span key={hop} className={`block h-11 w-11 shrink-0 ${hop ? "pip-hop" : ""}`}>
                  <Pip waving={false} className="h-full w-full" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-semibold">Pip</p>
                  <p className="text-xs text-muted-foreground">Your guide. Ask how anything works.</p>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close chat">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4" role="log" aria-live="polite">
                {messages.map((m, i) => (
                  <div key={i} className={`tour-bubble flex flex-col gap-2 ${m.from === "me" ? "items-end" : "items-start"}`}>
                    <p className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.from === "me" ? "bg-accent-gradient text-primary-foreground" : "bg-secondary"}`}>
                      {m.text}
                    </p>
                    {m.go && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => goTo(m.go!.id)}>
                        {m.go.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                ))}
                {typing && <p className="text-xs text-muted-foreground" role="status">Pip is typing…</p>}
                <div ref={endRef} />
              </div>

              <div className="space-y-3 border-t border-border p-4">
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="btn btn-ghost btn-sm" onClick={() => ask(s)} disabled={typing}>
                      {s}
                    </button>
                  ))}
                </div>
                <form onSubmit={submit} className="flex items-center gap-2">
                  <input
                    className="field"
                    autoFocus
                    placeholder="Ask Pip a question"
                    aria-label="Ask Pip a question"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={200}
                  />
                  <button type="submit" className="btn btn-primary shrink-0" disabled={!draft.trim() || typing}>
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
