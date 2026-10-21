import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

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

  useEffect(() => {
    const fit = () => {
      const scale = Math.min(1, (window.innerHeight - 32) / PHONE_H, (window.innerWidth - 32) / PHONE_W);
      stageRef.current?.style.setProperty("--phone-scale", String(Math.max(0.3, scale)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div className="phone-stage" ref={stageRef}>
      <div className="phone-frame">
        <div className="phone-speaker" aria-hidden />
        <iframe className="phone-screen" src="/" title="Demo Bank on a phone screen" />
        <div className="phone-home" aria-hidden />
      </div>
    </div>
  );
}
