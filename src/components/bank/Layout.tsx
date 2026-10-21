import { useEffect, type ReactNode } from "react";
import { Activity, Bitcoin, CreditCard, Gauge, Home, LogOut, PiggyBank, Send, TrendingUp, type LucideIcon } from "lucide-react";
import type { SectionId } from "@/lib/bank/data";

export const SECTIONS: { id: SectionId; label: string; title: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", title: "Overview", icon: Home },
  { id: "cards", label: "Cards", title: "Cards", icon: CreditCard },
  { id: "budgets", label: "Budgets", title: "Budgets", icon: PiggyBank },
  { id: "activity", label: "Activity", title: "Transactions", icon: Activity },
  { id: "crypto", label: "Crypto", title: "Crypto wallet", icon: Bitcoin },
  { id: "invest", label: "Invest", title: "Investments", icon: TrendingUp },
  { id: "payments", label: "Pay", title: "Payments", icon: Send },
  { id: "monitor", label: "Monitor", title: "Monitor", icon: Gauge },
];

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="bg-accent-gradient grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display text-sm font-bold text-primary-foreground">
        D
      </span>
      <span className="font-display text-lg font-semibold">
        Demo <span className="text-gradient">Bank</span>
      </span>
    </div>
  );
}

interface Props {
  section: SectionId;
  onNavigate: (id: SectionId) => void;
  onSignOut: () => void;
  children: ReactNode;
}

function NavList({ section, onNavigate }: Pick<Props, "section" | "onNavigate">) {
  return (
    <nav aria-label="Sections" className="flex flex-col gap-1">
      {SECTIONS.map(({ id, title, icon: Icon }) => {
        const active = id === section;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            aria-current={active ? "page" : undefined}
            data-tour={`nav-${id}`}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
              active ? "bg-accent-gradient text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {title}
          </button>
        );
      })}
    </nav>
  );
}

export function Layout({ section, onNavigate, onSignOut, children }: Props) {
  // --bar-p goes from 1 at the top of the page to 0 after 160px of scrolling.
  // The bottom bar uses it to grow at the top and shrink smoothly as you scroll.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const p = Math.max(0, Math.min(1, 1 - window.scrollY / 160));
      document.documentElement.style.setProperty("--bar-p", p.toFixed(3));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="min-h-screen" data-section={section}>
      <div className="section-orbs" aria-hidden />
      {/* Desktop sidebar */}
      <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-60 flex-col gap-8 p-5 desk:flex">
        <Logo />
        <NavList section={section} onNavigate={onNavigate} />
        <button onClick={onSignOut} className="btn btn-ghost mt-auto">
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </button>
      </aside>

      {/* Phone: no top bar. Navigation is the bottom bar; sign out is in Home's More menu. */}
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 desk:pb-12 desk:pl-[17.5rem] desk:pr-8 desk:pt-10 desk:max-w-none">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      {/* Phone bottom navigation */}
      <nav aria-label="Bottom navigation" className="bottom-nav glass fixed inset-x-0 bottom-0 z-40 bg-popover/85 grid grid-cols-8 rounded-none border-x-0 border-b-0 px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] desk:hidden">
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const active = id === section;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              data-tour={`nav-${id}`}
              className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-semibold ${
                active ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <span className={`tab-icon grid place-items-center rounded-lg ${active ? "bg-accent-gradient text-primary-foreground" : ""}`}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="tab-label truncate">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="section-title text-2xl font-semibold sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
