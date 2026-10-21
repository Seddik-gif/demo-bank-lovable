import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

// Shows the app inside a phone-sized frame. The app runs in an iframe that is
// 390px wide, so its phone layout (top bar, drawer, bottom bar) is what you see.
export const Route = createFileRoute("/phone")({
  head: () => ({
    meta: [{ title: "Demo Bank — Phone preview" }],
  }),
  component: PhonePreview,
});

// The frame keeps its full phone size and is scaled down to fit the window,
// so the whole phone is visible without scrolling.
const PHONE_W = 418;
const PHONE_H = 868;

function PhonePreview() {
  const stageRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLIFrameElement>(null);
  // "Swipe" lets the mouse drag the carousels. "Click" turns that off, so mouse clicks reach the buttons.
  const [mouseSwipe, setMouseSwipe] = useState(true);

  useEffect(() => {
    const fit = () => {
      // Leave room under the phone for the mouse mode switch.
      const scale = Math.min(1, (window.innerHeight - 96) / PHONE_H, (window.innerWidth - 32) / PHONE_W);
      stageRef.current?.style.setProperty("--phone-scale", String(Math.max(0.3, scale)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Tell the app inside the phone which mode is on. Runs again when the app reloads inside the frame.
  const applyMode = () => {
    const w = screenRef.current?.contentWindow as (Window & { __mouseSwipe?: boolean }) | null | undefined;
    if (w) w.__mouseSwipe = mouseSwipe;
  };
  useEffect(applyMode, [mouseSwipe]);

  return (
    <div className="phone-stage" ref={stageRef}>
      <div className="phone-frame">
        <div className="phone-speaker" aria-hidden />
        <iframe ref={screenRef} className="phone-screen" src="/" title="Demo Bank on a phone screen" onLoad={applyMode} />
        <div className="phone-home" aria-hidden />
      </div>
      <div className="phone-mode" role="group" aria-label="Mouse mode">
        <button type="button" aria-pressed={mouseSwipe} onClick={() => setMouseSwipe(true)} className={mouseSwipe ? "is-on" : ""}>
          Swipe with mouse
        </button>
        <button type="button" aria-pressed={!mouseSwipe} onClick={() => setMouseSwipe(false)} className={!mouseSwipe ? "is-on" : ""}>
          Click mode
        </button>
      </div>
    </div>
  );
}
