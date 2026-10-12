"use client";

import * as React from "react";
import { asksForStillness } from "./live";

const START = 1600;
const EVERY = 1500;
const RESUME = 12000;

/**
 * The idle tour every bench figure runs: while the figure is on screen, idle, and nobody
 * has touched it, `next` is called for one operation at a time. `takeOver` stops the tour
 * where it is; it comes back only after a long quiet.
 */
export function useTour(visible: boolean, busy: boolean, next: () => void, signal: unknown) {
  const touring = React.useRef(true);
  const turn = React.useRef(0);
  const quiet = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tick, setTick] = React.useState(0);
  const latest = React.useRef(next);
  React.useEffect(() => {
    latest.current = next;
  });

  React.useEffect(() => {
    if (!visible || busy || !touring.current || asksForStillness()) return;
    const timer = setTimeout(() => {
      if (touring.current) latest.current();
    }, turn.current++ ? EVERY : START);
    return () => clearTimeout(timer);
  }, [visible, busy, signal, tick]);

  React.useEffect(() => () => {
    if (quiet.current) clearTimeout(quiet.current);
  }, []);

  const takeOver = React.useCallback(() => {
    touring.current = false;
    if (quiet.current) clearTimeout(quiet.current);
    quiet.current = setTimeout(() => {
      touring.current = true;
      setTick((value) => value + 1);
    }, RESUME);
  }, []);

  return { takeOver, turn };
}
