import { useEffect, useState } from "react";
import type { SectionId } from "@/lib/bank/data";
import { track } from "@/lib/bank/monitor";
import { applyPalette, storedPalette } from "@/lib/bank/theme";
import { initSettings, useSettings } from "@/lib/bank/settings";
import { BankProvider } from "@/lib/bank/store";
import { ErrorBoundary } from "./ErrorBoundary";
import { Layout, SECTIONS } from "./Layout";
import { Login } from "./Login";
import { HomeSection } from "./sections/Home";
import { CardsSection } from "./sections/Cards";
import { BudgetsSection } from "./sections/Budgets";
import { ActivitySection } from "./sections/Activity";
import { CryptoSection, InvestSection } from "./sections/Holdings";
import { MonitorSection } from "./sections/Monitor";
import { PaymentsSection } from "./sections/Payments";
import { REPLAY_TOUR_EVENT, WelcomeTour } from "./Welcome";
import { getProfileName } from "@/lib/bank/profile";
import { NoticeToast } from "./Notifications";
import { CardFlightLayer } from "./CardFlight";
import { CardGlow } from "./CardGlow";

type ViewProps = { onNavigate: (id: SectionId) => void; onSignOut: () => void };

const VIEWS: Record<SectionId, (props: ViewProps) => React.JSX.Element> = {
  home: HomeSection,
  cards: CardsSection,
  budgets: BudgetsSection,
  activity: ActivitySection,
  crypto: CryptoSection,
  invest: InvestSection,
  payments: PaymentsSection,
  monitor: MonitorSection,
};

function ScrollProgress() {
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      document.documentElement.style.setProperty("--progress", String(max > 0 ? window.scrollY / max : 0));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  });
  return <div className="scroll-progress" aria-hidden />;
}

export function DemoBankApp() {
  const [signedIn, setSignedIn] = useState(false);
  const [section, setSection] = useState<SectionId>("home");
  // Set only right after a new account is created; the guide greets that user once.
  const [welcomeName, setWelcomeName] = useState<string | null>(null);

  const handleSignIn = (newFirstName?: string) => {
    if (newFirstName) setWelcomeName(newFirstName);
    setSignedIn(true);
  };

  // Profile > Help > "Show the guide again": start the guide on the home screen.
  useEffect(() => {
    const onReplay = () => {
      setSection("home");
      setWelcomeName(getProfileName());
    };
    window.addEventListener(REPLAY_TOUR_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_TOUR_EVENT, onReplay);
  }, []);

  // Apply the saved settings and palette on this device (black metal by default).
  useEffect(() => {
    initSettings();
    applyPalette(storedPalette());
  }, []);

  // Auto-lock: sign out after the chosen period without activity.
  const settings = useSettings();
  useEffect(() => {
    if (!signedIn || settings.autoLockMinutes === 0) return;
    let last = Date.now();
    const bump = () => { last = Date.now(); };
    const activity = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    activity.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const id = window.setInterval(() => {
      if (Date.now() - last > settings.autoLockMinutes * 60_000) {
        track("logout", `Auto-locked after ${settings.autoLockMinutes} min of inactivity`);
        setSignedIn(false);
        setSection("home");
      }
    }, 5_000);
    return () => {
      activity.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(id);
    };
  }, [signedIn, settings.autoLockMinutes]);

  useEffect(() => {
    const onError = (e: ErrorEvent) => track("error", `Uncaught error: ${e.message}`);
    const onRejection = (e: PromiseRejectionEvent) =>
      track("error", `Unhandled rejection: ${e.reason instanceof Error ? e.reason.message : String(e.reason)}`);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    track("page_view", SECTIONS.find((s) => s.id === section)!.title);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [section, signedIn]);

  const signOut = () => {
    track("logout", "Signed out");
    setSignedIn(false);
    setSection("home");
  };

  const View = VIEWS[section];

  return (
    <BankProvider>
      <ScrollProgress />
      {signedIn ? (
        // The app fades in when signing in or finishing sign-up, instead of appearing all at once.
        <div className="fade-in">
          {/* The Cards page lights the whole screen in the colour of the card in front. The page sits above that glow. */}
          {section === "cards" && <CardGlow />}
          <div className="relative z-10">
            <Layout section={section} onNavigate={setSection} onSignOut={signOut}>
              <ErrorBoundary resetKey={section}>
                <div key={section} className="page-fade">
                  <View onNavigate={setSection} onSignOut={signOut} />
                </div>
              </ErrorBoundary>
            </Layout>
          </div>
        </div>
      ) : (
        <Login onSuccess={handleSignIn} />
      )}
      {signedIn && welcomeName && <WelcomeTour name={welcomeName} onDone={() => setWelcomeName(null)} />}
      <NoticeToast />
      <CardFlightLayer />
    </BankProvider>
  );
}
