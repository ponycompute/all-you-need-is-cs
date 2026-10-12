"use client";

import { useCallback, useRef, useState } from "react";
import P5Wrapper, { type SketchFunction } from "@/components/viz/P5Wrapper";

const BLOCK_W = 160;
const BLOCK_H = 42;
const GAP = 6;

export default function StackViz() {
  const [stack, setStack] = useState<number[]>([42, 17, 89]);
  const [animating, setAnimating] = useState<"push" | "pop" | null>(null);
  const [note, setNote] = useState("");
  const [pushVal, setPushVal] = useState("");
  const stackRef = useRef(stack);
  const animRef = useRef({ type: null as string | null, progress: 0, value: 0 });

  stackRef.current = stack;

  const sketch: SketchFunction = useCallback((p) => {
    p.setup = () => {
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.textAlign(p.CENTER, p.CENTER);
    };

    p.draw = () => {
      p.background(225, 10, 8);
      const arr = stackRef.current;
      const anim = animRef.current;
      const startY = p.height * 0.85;
      const cx = p.width / 2;

      // TOP label
      p.fill(260, 50, 80);
      p.textSize(11);
      p.text("TOP ↓", cx, startY - (arr.length + 1) * (BLOCK_H + GAP) - 20);

      // Render blocks bottom to top
      for (let i = 0; i < arr.length; i++) {
        const blockY = startY - (i + 1) * (BLOCK_H + GAP);

        p.push();
        p.fill(260, 70, 80);
        p.stroke(270, 60, 50);
        p.strokeWeight(1.5);
        p.rect(cx - BLOCK_W / 2, blockY, BLOCK_W, BLOCK_H, 6);

        p.fill(0, 0, 100);
        p.noStroke();
        p.textSize(14);
        p.text(arr[i], cx, blockY + BLOCK_H / 2);

        // Index label
        p.fill(0, 0, 40);
        p.textSize(10);
        p.text(`[${i}]`, cx + BLOCK_W / 2 + 20, blockY + BLOCK_H / 2);

        p.pop();
      }

      // Animating push preview
      if (anim.type === "push") {
        const targetY = startY - (arr.length + 1) * (BLOCK_H + GAP);
        const currentY = p.lerp(startY + 30, targetY, anim.progress);

        p.push();
        p.fill(140, 60, 75);
        p.stroke(150, 60, 55);
        p.strokeWeight(1.5);
        p.rect(cx - BLOCK_W / 2, currentY, BLOCK_W, BLOCK_H, 6);

        p.fill(0, 0, 100);
        p.noStroke();
        p.textSize(14);
        p.text(anim.value, cx, currentY + BLOCK_H / 2);
        p.pop();
      }

      // Animating pop
      if (anim.type === "pop" && arr.length > 0) {
        const originalY = startY - arr.length * (BLOCK_H + GAP);
        const currentY = p.lerp(originalY, startY + 50, anim.progress);
        const alpha = 100 * (1 - anim.progress);

        p.push();
        p.fill(0, 80, 60, alpha);
        p.stroke(0, 80, 50, alpha);
        p.strokeWeight(1.5);
        p.rect(cx - BLOCK_W / 2, currentY, BLOCK_W, BLOCK_H, 6);

        p.fill(0, 0, 100, alpha);
        p.noStroke();
        p.textSize(14);
        p.text(anim.value, cx, currentY + BLOCK_H / 2);
        p.pop();
      }

      // Empty state
      if (arr.length === 0 && anim.type === null) {
        p.fill(0, 0, 25);
        p.textSize(13);
        p.text("Stack is empty", cx, p.height / 2);
      }
    };
  }, []);

  const push = () => {
    if (stack.length >= 5) {
      setNote("The stack is full: this lab holds 5 items. Pop one first.");
      return;
    }
    setNote(pushVal ? "" : "No value typed, so a random one was used.");
    const val = pushVal ? parseInt(pushVal) : Math.floor(Math.random() * 100);
    setAnimating("push");
    animRef.current = { type: "push", progress: 0, value: val };

    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / 350, 1);
      animRef.current.progress = progress;
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setStack((prev) => [...prev, val]);
        setAnimating(null);
        animRef.current = { type: null, progress: 0, value: 0 };
        setPushVal("");
      }
    };
    requestAnimationFrame(animate);
  };

  const pop = () => {
    if (stack.length === 0) return;
    const val = stack[stack.length - 1];
    setAnimating("pop");
    animRef.current = { type: "pop", progress: 0, value: val };

    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / 350, 1);
      animRef.current.progress = progress;
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setStack((prev) => prev.slice(0, -1));
        setAnimating(null);
        animRef.current = { type: null, progress: 0, value: 0 };
      }
    };
    requestAnimationFrame(animate);
  };

  return (
    <div className="space-y-4">
      <P5Wrapper sketch={sketch} className="min-h-[350px]" />

      <div className="flex flex-wrap items-center gap-2 justify-center">
        <input
          type="number"
          placeholder="Value"
          aria-label="Value; leave blank for a random one"
          value={pushVal}
          onChange={(e) => setPushVal(e.target.value)}
          className="ui-input w-24"
        />
        <button
          type="button"
          onClick={push}
          disabled={animating !== null}
          className="ui-btn-primary disabled:opacity-40"
        >
          Push
        </button>
        <button
          type="button"
          onClick={pop}
          disabled={animating !== null || stack.length === 0}
          className="ui-btn-secondary disabled:opacity-40"
        >
          Pop
        </button>
      </div>
      <p className="ui-caption text-center">
        TOP → {stack.length > 0 ? stack[stack.length - 1] : "—"} · Size: {stack.length}
      </p>
      {note ? <p className="text-center text-sm leading-[1.43] text-body">{note}</p> : null}
    </div>
  );
}