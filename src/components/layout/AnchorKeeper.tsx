"use client";

import { useEffect } from "react";

/** How long after a jump the target is held in place while labs near it mount and change height. */
const HOLD = 2500;

/**
 * Labs mount lazily, so the page above a section can grow just after a jump to it.
 * For a moment after each jump this re-aligns the target whenever the page's height
 * changes, and lets go as soon as the reader scrolls by hand.
 */
export default function AnchorKeeper() {
  useEffect(() => {
    let release = () => {};
    const hold = () => {
      release();
      const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if (!target) return;
      const align = () => target.scrollIntoView({ block: "start" });
      const observer = new ResizeObserver(align);
      observer.observe(document.body);
      const timer = setTimeout(() => release(), HOLD);
      const stop = () => release();
      const inputs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
      inputs.forEach((name) => window.addEventListener(name, stop, { passive: true }));
      release = () => {
        observer.disconnect();
        clearTimeout(timer);
        inputs.forEach((name) => window.removeEventListener(name, stop));
        release = () => {};
      };
      align();
    };
    // A click on a link to the hash already in the address bar fires no hashchange.
    const clicked = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
      if (link) setTimeout(hold, 0);
    };
    if (window.location.hash) hold();
    window.addEventListener("hashchange", hold);
    document.addEventListener("click", clicked);
    return () => {
      release();
      window.removeEventListener("hashchange", hold);
      document.removeEventListener("click", clicked);
    };
  }, []);
  return null;
}
