"use client";

import { useCallback, useRef, useState } from "react";
import P5Wrapper, { type SketchFunction } from "@/components/viz/P5Wrapper";

/** As many bars as fit the canvas at its narrowest logical width. */
const CAPACITY = 9;

export default function ArrayViz() {
  const [array, setArray] = useState<number[]>([42, 23, 17, 89, 55, 31, 67]);
  const [animTarget, setAnimTarget] = useState<number | null>(null);
  const [status, setStatus] = useState("Insert and delete pick a random position; watch how many elements have to move.");
  const [animType, setAnimType] = useState<"insert" | "delete" | "access" | null>(null);
  const arrayRef = useRef(array);
  const animRef = useRef({ target: null as number | null, type: null as string | null, progress: 0 });

  arrayRef.current = array;

  const sketch: SketchFunction = useCallback((p) => {
    const BAR_W = 60;
    const GAP = 12;
    const BASE_Y_RATIO = 0.8;

    p.setup = () => {
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.textFont("var(--font-geist-mono), monospace");
      p.textAlign(p.CENTER, p.CENTER);
    };

    p.draw = () => {
      p.background(225, 10, 8);
      const arr = arrayRef.current;
      const anim = animRef.current;
      const totalW = arr.length * (BAR_W + GAP) - GAP;
      const startX = (p.width - totalW) / 2;

      arr.forEach((val, i) => {
        const x = startX + i * (BAR_W + GAP);
        const barH = p.map(val, 0, 100, 10, p.height * 0.6);
        const y = p.height * BASE_Y_RATIO - barH;

        // Animation states
        let hue = 255; // purple
        let sat = 70;
        let bri = 80;
        let extraScale = 1;

        if (anim.type === "access" && anim.target === i) {
          hue = 45; sat = 90; bri = 95; // yellow pulse
          extraScale = 1 + 0.08 * p.sin(p.frameCount * 0.3);
        } else if (anim.type === "insert" && anim.target === i && anim.progress < 1) {
          hue = 140; sat = 60; bri = 70;
        } else if (anim.type === "delete" && anim.target === i && anim.progress < 1) {
          hue = 0; sat = 80; bri = 60;
        }

        p.push();
        p.translate(x + BAR_W / 2, y + barH / 2);
        p.scale(extraScale);

        p.fill(hue, sat, bri);
        p.stroke(260, 40, 40);
        p.strokeWeight(1);
        p.rect(-BAR_W / 2, -barH / 2, BAR_W, barH, 4);

        p.fill(0, 0, 100);
        p.noStroke();
        p.textSize(13);
        p.text(val, 0, 0);

        // Index label below
        p.fill(0, 0, 50);
        p.textSize(11);
        p.text(i, 0, barH / 2 + 18);

        p.pop();
      });
    };
  }, []);

  const insertValue = () => {
    if (array.length >= CAPACITY) {
      setStatus(`The array is full (${CAPACITY} cells). Delete an element first.`);
      return;
    }
    const val = Math.floor(Math.random() * 100);
    const idx = Math.floor(Math.random() * (array.length + 1));
    const moved = array.length - idx;
    // Insert first, then light up the new cell, so the highlight is on the element that arrived.
    setArray((prev) => [...prev.slice(0, idx), val, ...prev.slice(idx)]);
    setStatus(
      `Inserted ${val} at index ${idx}. ${moved ? `The ${moved} ${moved === 1 ? "element" : "elements"} from index ${idx} on each moved one cell right.` : "It went on the end, so nothing had to move."}`
    );
    setAnimTarget(idx);
    setAnimType("insert");
    animRef.current = { target: idx, type: "insert", progress: 0 };
    setTimeout(() => {
      setAnimTarget(null);
      setAnimType(null);
      animRef.current = { target: null, type: null, progress: 0 };
    }, 400);
  };

  const deleteValue = () => {
    if (array.length <= 1) {
      setStatus("One element left; the lab keeps it so there is something to access.");
      return;
    }
    const idx = Math.floor(Math.random() * array.length);
    const moved = array.length - 1 - idx;
    setStatus(
      `Deleted ${array[idx]} from index ${idx}. ${moved ? `The ${moved} ${moved === 1 ? "element" : "elements"} after it each moved one cell left.` : "It was the last element, so nothing had to move."}`
    );
    setAnimTarget(idx);
    setAnimType("delete");
    animRef.current = { target: idx, type: "delete", progress: 0 };
    setTimeout(() => {
      setArray((prev) => prev.filter((_, i) => i !== idx));
      setAnimTarget(null);
      setAnimType(null);
      animRef.current = { target: null, type: null, progress: 0 };
    }, 400);
  };

  const accessValue = (idx: number) => {
    if (idx < 0 || idx >= array.length) return;
    setStatus(`A[${idx}] = ${array[idx]}: one step, whatever the index. Nothing is scanned or moved.`);
    setAnimTarget(idx);
    setAnimType("access");
    animRef.current = { target: idx, type: "access", progress: 0 };
    setTimeout(() => {
      setAnimTarget(null);
      setAnimType(null);
      animRef.current = { target: null, type: null, progress: 0 };
    }, 800);
  };

  return (
    <div className="space-y-4">
      <P5Wrapper sketch={sketch} className="min-h-[320px]" />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <button type="button" onClick={insertValue} className="ui-btn-primary">
          Insert (random)
        </button>
        <button type="button" onClick={deleteValue} className="ui-btn-secondary">
          Delete (random)
        </button>
        {array.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => accessValue(i)}
            className="ui-btn-secondary-sm"
          >
            [{i}]
          </button>
        ))}
      </div>
      <p className="ui-caption text-center">
        Elements: {array.length} of {CAPACITY} · Click [index] to access
      </p>
      <p className="text-center text-sm leading-[1.43] text-body">{status}</p>
    </div>
  );
}