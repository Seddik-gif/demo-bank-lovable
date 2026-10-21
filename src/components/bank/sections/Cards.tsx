import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Eye, EyeOff, Plus, Settings2, Snowflake } from "lucide-react";
import { setGlowTone } from "@/lib/bank/cardGlow";
import { mouseDragHandlers } from "@/lib/bank/dragScroll";
import { takeFocusedCard } from "@/lib/bank/cardFocus";
import { CardSettingsSheet } from "./CardSettingsSheet";
import type { Card } from "@/lib/bank/data";
import { MAX_CARDS } from "@/lib/bank/money";
import { getProfileName } from "@/lib/bank/profile";
import { useBank } from "@/lib/bank/store";
import { SectionHeader } from "../Layout";
import { AddCardSheet } from "./AddCardSheet";
import { CardFace, FINISH } from "../CardFace";

// A card is 22rem wide, close to the size of the screen. The track scrolls, and the card in front is centred.
const SLOT = "22rem";
const GAP = 20;

/** The 3D pose of a slot: the further it is from the centre, the more it turns away and sinks back. */
function pose(distance: number) {
  const d = Math.max(-2, Math.min(2, distance));
  const away = Math.min(Math.abs(d), 2);
  return {
    transform: `perspective(1000px) translateZ(${-away * 90}px) rotateY(${Math.max(-70, Math.min(70, d * -38))}deg) scale(${1 - away * 0.08})`,
    opacity: 1 - away * 0.22,
  };
}

const cardNumber = (card: Card) => card.number ?? `•••• •••• •••• ${card.last4}`;
const expiryOf = (card: Card) => card.expiry ?? "••/••";
const cvvOf = (card: Card) => card.cvv ?? "•••";

/** The front of a card: the same glass design as on Home. */
function MetalFront({ card, active }: { card: Card; frozen: boolean; active: boolean }) {
  return (
    <div className={`absolute inset-0 transition-opacity duration-500 ${active ? "" : "opacity-90"}`} style={faceStyle} role="img" aria-label={`${card.label} ending ${card.last4}${card.frozen ? ", frozen" : ""}`}>
      <CardFace card={card} />
    </div>
  );
}

/** The back of a card: the details, on the same coloured glass. */
function MetalBack({ card, holder }: { card: Card; frozen: boolean; active: boolean; holder: string }) {
  const { background, ink } = FINISH[card.tone];
  return (
    <div
      className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[1.1rem] border border-white/60 p-5"
      style={{
        ...faceStyle,
        transform: "rotateY(180deg)",
        background,
        color: ink,
        backdropFilter: "blur(14px) saturate(190%)",
        WebkitBackdropFilter: "blur(14px) saturate(190%)",
        boxShadow: "0 34px 44px -22px rgba(20,10,60,0.6), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
      role="group"
      aria-label={`${card.label} details`}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-9 flex-1 rounded-sm bg-white/80 px-3 py-1.5 text-right font-mono text-sm text-black/80">{cvvOf(card)}</div>
          <p className="text-[10px] uppercase tracking-widest opacity-80">CVV</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="flex justify-between gap-3"><span className="opacity-70">Name</span><span className="truncate font-semibold">{holder}</span></p>
          <p className="flex justify-between gap-3"><span className="opacity-70">Number</span><span className="font-mono tracking-wider">{cardNumber(card)}</span></p>
          <p className="flex justify-between gap-3"><span className="opacity-70">Expires</span><span className="font-mono">{expiryOf(card)}</span></p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs opacity-80">
        <span>{card.type}</span>
        <span className="font-display text-base font-bold italic">{card.network}</span>
      </div>
    </div>
  );
}

// Keeps each face the same size as the card, and out of the way of the other face.
const faceStyle: CSSProperties = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };

export function CardsSection() {
  const { cards, toggleCard, markCardDelivered } = useBank();
  const [adding, setAdding] = useState(false);
  const [pos, setPos] = useState(0);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const frame = useRef<number>(0);
  const [drag] = useState(() => mouseDragHandlers(() => track.current));

  const canAdd = cards.length < MAX_CARDS;
  // The add tile comes after the last card, when there is room for another.
  const slots = cards.length + (canAdd ? 1 : 0);
  const active = Math.min(slots - 1, Math.round(pos));
  const cardNow = active < cards.length ? cards[active] : undefined;
  const holder = getProfileName().toUpperCase();

  // Swiping to another card turns the previous card back, and changes the glow to the new card's colour.
  useEffect(() => {
    setFlippedId(null);
  }, [active]);

  useEffect(() => {
    setGlowTone(cardNow?.tone ?? null);
  }, [cardNow?.tone]);

  useEffect(() => () => setGlowTone(null), []);

  const step = () => {
    const el = track.current?.children[0] as HTMLElement | undefined;
    return el ? el.offsetWidth + GAP : 1;
  };

  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = track.current;
      if (!el) return;
      setPos(Math.max(0, Math.min(slots - 1, el.scrollLeft / step())));
    });
  };

  const goTo = (i: number) => track.current?.scrollTo({ left: i * step(), behavior: "smooth" });

  // Opened from a card on Home: show that card first.
  useEffect(() => {
    const id = takeFocusedCard();
    const i = id ? cards.findIndex((c) => c.id === id) : -1;
    if (i >= 0) window.setTimeout(() => goTo(i), 0);
    // Only on the first render of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAdded = (index: number) => {
    // Once the new card is in the list, bring it into view.
    window.setTimeout(() => goTo(index), 80);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Cards" subtitle="Swipe between your cards. Swipe past the last one to add a new card." />

      <div className="relative -mx-4 overflow-visible">
        <div
          ref={track}
          onScroll={onScroll}
          {...drag}
          className="no-scrollbar flex snap-x snap-mandatory items-center gap-5 overflow-x-auto py-8"
          style={{ paddingInline: "calc(50% - 11rem)" }}
          aria-label="Cards"
        >
          {cards.map((c, i) => {
            const isActive = i === active;
            const flipped = isActive && flippedId === c.id;
            return (
              <div key={c.id} className="shrink-0 snap-center transition-[transform,opacity] duration-300 ease-out" style={{ width: SLOT, ...pose(i - pos) }}>
                <div className="relative aspect-[1.586] w-full transition-transform duration-700 ease-in-out" style={{ transformStyle: "preserve-3d", transform: `rotateY(${flipped ? 180 : 0}deg)` }}>
                  <MetalFront card={c} frozen={c.frozen} active={isActive} />
                  <MetalBack card={c} frozen={c.frozen} active={isActive} holder={holder} />
                </div>
              </div>
            );
          })}
          {canAdd && (
            <div className="shrink-0 snap-center transition-[transform,opacity] duration-300 ease-out" style={{ width: SLOT, ...pose(cards.length - pos) }}>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="glass flex aspect-[1.586] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border text-sm font-semibold transition-colors hover:bg-secondary"
                aria-label="Add a new card"
              >
                <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-gradient text-primary-foreground shadow-lg">
                  <Plus className="h-7 w-7" aria-hidden />
                </span>
                Add a card
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dots: one per card, plus the add tile. */}
      <div className="flex justify-center gap-2" role="tablist" aria-label="Choose a card">
        {Array.from({ length: slots }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={i < cards.length ? `Card ${i + 1}` : "Add a card"}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-accent" : "w-2 bg-muted-foreground/40"}`}
          />
        ))}
      </div>

      {cardNow && cardNow.delivered === false ? (
        <div className="glass space-y-3 p-5 text-center text-sm">
          <p className="font-semibold">{cardNow.label} is on its way</p>
          <p className="text-xs text-muted-foreground">This physical card works once it arrives. Details, freeze and settings open after delivery.</p>
          <button type="button" className="btn btn-primary" onClick={() => markCardDelivered(cardNow.id)}>Mark as delivered (demo)</button>
        </div>
      ) : cardNow ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setFlippedId(flippedId === cardNow.id ? null : cardNow.id)} aria-pressed={flippedId === cardNow.id}>
              {flippedId === cardNow.id ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              {flippedId === cardNow.id ? "Hide details" : "Show details"}
            </button>
            <button onClick={() => toggleCard(cardNow.id)} className={`btn ${cardNow.frozen ? "btn-primary" : "btn-ghost"}`}>
              <Snowflake className="h-4 w-4" aria-hidden />
              {cardNow.frozen ? "Unfreeze" : "Freeze"}
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {cardNow.label} · {cardNow.network} · {cardNow.frozen ? "Payments are blocked" : "Active"}
          </p>
          <div className="pt-20 text-center">
            <button type="button" className="btn btn-primary" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="h-4 w-4" aria-hidden /> Card settings
            </button>
          </div>
        </div>
      ) : canAdd ? (
        <div className="glass space-y-3 p-5 text-center">
          <p className="font-semibold">Add a new card</p>
          <p className="text-sm text-muted-foreground">Choose a name, a network, a type and a metal finish. The card details are generated, not typed in.</p>
          <button type="button" className="btn btn-primary w-full" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Add a card
          </button>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">You have {MAX_CARDS} cards, the most this demo allows. Remove one to add another.</p>
      )}

      {adding && <AddCardSheet onClose={() => setAdding(false)} onAdded={onAdded} />}
      {settingsOpen && cardNow && <CardSettingsSheet card={cardNow} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
