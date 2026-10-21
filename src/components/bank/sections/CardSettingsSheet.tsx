import { useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";
import type { Card } from "@/lib/bank/data";
import { useBank } from "@/lib/bank/store";
import { CardControls } from "./MoneyPlanning";

/** One card's settings in a window. The page behind is faded and blurred while it is open. */
export function CardSettingsSheet({ card, onClose }: { card: Card; onClose: () => void }) {
  const { removeCard } = useBank();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const remove = () => {
    if (!confirmDelete) return setConfirmDelete(true);
    const res = removeCard(card.id);
    if (res.ok) onClose();
    else setError(res.error);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`${card.label} settings`}>
      <button className="fade-in absolute inset-0 bg-background/70 backdrop-blur-md" aria-label="Close settings" onClick={onClose} />
      <div className="glass page-fade relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-b-none sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{card.label}</h2>
            <p className="text-xs text-muted-foreground">{card.network} · {card.type} · ••{card.last4}</p>
          </div>
          <button className="btn btn-ghost btn-sm shrink-0" onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden /></button>
        </div>
        <div className="space-y-5 overflow-y-auto overscroll-contain p-5 pb-8">
          <CardControls card={card} />
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-semibold">Delete this card</p>
            <p className="text-xs text-muted-foreground">The card is removed from your wallet. Its past transactions stay in your activity.</p>
            <button type="button" onClick={remove} className={`btn w-full ${confirmDelete ? "btn-danger" : "btn-ghost"}`}>
              <Trash2 className="h-4 w-4" aria-hidden /> {confirmDelete ? "Tap again to delete this card" : "Delete this card"}
            </button>
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
