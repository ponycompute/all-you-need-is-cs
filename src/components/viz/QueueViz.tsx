"use client";

import { useCallback, useRef, useState } from "react";
import P5Wrapper, { type SketchFunction } from "@/components/viz/P5Wrapper";

const BLOCK_W = 54;
const BLOCK_H = 100;

export default function QueueViz() {
  const [queue, setQueue] = useState<number[]>([42, 17, 89]);
  const [animating, setAnimating] = useState<"enqueue" | "dequeue" | null>(null);
  const [note, setNote] = useState("");
  const [enqVal, setEnqVal] = useState("");
  const queueRef = useRef(queue);
  const animRef = useRef({ type: null as string | null, progress: 0, value: 0 });

  queueRef.current = queue;

  const sketch: SketchFunction = useCallback((p) => {
    p.setup = () => {
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.textAlign(p.CENTER, p.CENTER);
    };

    p.draw = () => {
      p.background(225, 10, 8);
      const arr = queueRef.current;
      const anim = animRef.current;
      const startX = 60;
      const cy = p.height / 2;

      // FRONT / REAR labels
      p.fill(190, 70, 75);
      p.textSize(10);
      if (arr.length > 0) {
        p.text("FRONT →", startX - 35, cy);
        p.text("← REAR", startX + (arr.length - 1) * (BLOCK_W + 8) + BLOCK_W + 35, cy);
      }

      // Empty
      if (arr.length === 0 && anim.type === null) {
        p.fill(0, 0, 25);
        p.textSize(13);
        p.text("Queue is empty", p.width / 2, cy);
        return;
      }

      // Render blocks left to right
      for (let i = 0; i < arr.length; i++) {
        const bx = startX + i * (BLOCK_W + 8);

        p.push();
        p.fill(190, 70, 75);
        p.stroke(200, 70, 55);
        p.strokeWeight(1.5);
        p.rect(bx, cy - BLOCK_H / 2, BLOCK_W, BLOCK_H, 6);

        p.fill(0, 0, 100);
        p.noStroke();
        p.textSize(13);
        p.text(arr[i], bx + BLOCK_W / 2, cy);

        p.pop();
      }

      // Animating enqueue (slide in from right)
      if (anim.type === "enqueue") {
        const targetX = startX + arr.length * (BLOCK_W + 8);
        const currentX = p.lerp(p.width + 40, targetX, anim.progress);

        p.push();
        p.fill(140, 60, 70);
        p.stroke(150, 60, 55);
        p.strokeWeight(1.5);
        p.rect(currentX, cy - BLOCK_H / 2, BLOCK_W, BLOCK_H, 6);

        p.fill(0, 0, 100);
        p.noStroke();
        p.textSize(13);
        p.text(anim.value, currentX + BLOCK_W / 2, cy);
        p.pop();
      }

      // Animating dequeue (slide out left)
      if (anim.type === "dequeue" && arr.length > 0) {
        const currentX = p.lerp(startX, -BLOCK_W - 40, anim.progress);
        const alpha = 100 * (1 - anim.progress);

        p.push();
        p.fill(0, 70, 55, alpha);
        p.stroke(0, 70, 45, alpha);
        p.strokeWeight(1.5);
        p.rect(currentX, cy - BLOCK_H / 2, BLOCK_W, BLOCK_H, 6);

        p.fill(0, 0, 100, alpha);
        p.noStroke();
        p.textSize(13);
        p.text(anim.value, currentX + BLOCK_W / 2, cy);
        p.pop();
      }
    };
  }, []);

  const enqueue = () => {
    if (queue.length >= 8) {
      setNote("The queue is full: this lab holds 8 items. Dequeue one first.");
      return;
    }
    setNote(enqVal ? "" : "No value typed, so a random one was used.");
    const val = enqVal ? parseInt(enqVal) : Math.floor(Math.random() * 100);
    setAnimating("enqueue");
    animRef.current = { type: "enqueue", progress: 0, value: val };

    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / 400, 1);
      animRef.current.progress = progress;
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setQueue((prev) => [...prev, val]);
        setAnimating(null);
        animRef.current = { type: null, progress: 0, value: 0 };
        setEnqVal("");
      }
    };
    requestAnimationFrame(animate);
  };

  const dequeue = () => {
    if (queue.length === 0) return;
    const val = queue[0];
    setAnimating("dequeue");
    animRef.current = { type: "dequeue", progress: 0, value: val };

    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / 400, 1);
      animRef.current.progress = progress;
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setQueue((prev) => prev.slice(1));
        setAnimating(null);
        animRef.current = { type: null, progress: 0, value: 0 };
      }
    };
    requestAnimationFrame(animate);
  };

  return (
    <div className="space-y-4">
      <P5Wrapper sketch={sketch} className="min-h-[280px]" />

      <div className="flex flex-wrap items-center gap-2 justify-center">
        <input
          type="number"
          placeholder="Value"
          aria-label="Value; leave blank for a random one"
          value={enqVal}
          onChange={(e) => setEnqVal(e.target.value)}
          className="ui-input w-24"
        />
        <button
          type="button"
          onClick={enqueue}
          disabled={animating !== null}
          className="ui-btn-primary disabled:opacity-40"
        >
          Enqueue
        </button>
        <button
          type="button"
          onClick={dequeue}
          disabled={animating !== null || queue.length === 0}
          className="ui-btn-secondary disabled:opacity-40"
        >
          Dequeue
        </button>
      </div>
      <p className="ui-caption text-center">
        FRONT → {queue.length > 0 ? queue[0] : "—"} · REAR → {queue.length > 0 ? queue[queue.length - 1] : "—"} · Size: {queue.length}
      </p>
      {note ? <p className="text-center text-sm leading-[1.43] text-body">{note}</p> : null}
    </div>
  );
}