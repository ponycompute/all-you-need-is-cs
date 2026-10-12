"use client";

import * as React from "react";
import type { GantryState } from "./engine";
import type { GantryHandle } from "./TreeGantry";
import type { TreeFrame } from "./types";

/**
 * The bookkeeping every gantry lab shares: the handle once the gantry is ready, whether it is
 * moving, and the note to show under the figure once the frames just played have finished.
 */
export function useLab() {
  const [gantry, setGantry] = React.useState<GantryHandle | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState("");
  const pending = React.useRef("");

  const onState = React.useCallback((state: GantryState, handle: GantryHandle) => {
    setGantry(handle);
    setBusy(state.busy);
    if (!state.busy && pending.current) {
      setNote(pending.current);
      pending.current = "";
    }
  }, []);

  /** Plays frames and, once they finish, shows `after`; `commit` runs only if the gantry accepted them. */
  const play = React.useCallback((handle: GantryHandle, frames: TreeFrame[], after: string, commit?: () => void) => {
    if (!frames.length) {
      setNote(after);
      return false;
    }
    if (!handle.play(frames)) return false;
    pending.current = after;
    commit?.();
    return true;
  }, []);

  return { gantry, busy, note, setNote, onState, play };
}
