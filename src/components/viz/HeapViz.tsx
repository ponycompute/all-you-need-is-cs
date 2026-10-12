"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import P5Wrapper, { type SketchFunction } from "@/components/viz/P5Wrapper";

const MAX_HEAP_SAMPLE = [100, 90, 60, 70, 50, 15, 55, 20];
const MIN_HEAP_SAMPLE = [10, 20, 15, 40, 70, 60, 55, 100];
const MOVE_MS = 650;

type Point = { x: number; y: number };
type HeapAnimation =
  | {
      type: "swap";
      fromIdx: number;
      toIdx: number;
      fromValue: number;
      toValue: number;
      start: number;
      duration: number;
    }
  | {
      type: "to-output";
      fromIdx: number;
      value: number;
      outputIndex: number;
      start: number;
      duration: number;
    }
  | {
      type: "last-to-root";
      fromIdx: number;
      value: number;
      start: number;
      duration: number;
    }
  | null;

export default function HeapViz() {
  const [heap, setHeap] = useState<number[]>(MAX_HEAP_SAMPLE);
  const [extracted, setExtracted] = useState<number[]>([]);
  const [isMax, setIsMax] = useState(true);
  const [animating, setAnimating] = useState<"up" | "down" | null>(null);
  const [insertVal, setInsertVal] = useState("");
  const [status, setStatus] = useState("Extract moves the root out, moves the last node to root, then restores the heap.");
  const heapRef = useRef(heap);
  const extractedRef = useRef(extracted);
  const animRef = useRef<HeapAnimation>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    heapRef.current = heap;
  }, [heap]);

  useEffect(() => {
    extractedRef.current = extracted;
  }, [extracted]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const sketch: SketchFunction = useCallback((p) => {
    p.setup = () => {
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.textAlign(p.CENTER, p.CENTER);
    };

    const nodePoint = (idx: number, width: number): Point => {
      const level = Math.floor(Math.log2(idx + 1));
      const firstAtLevel = 2 ** level - 1;
      const posInLevel = idx - firstAtLevel;
      const nodesAtLevel = 2 ** level;
      const y = 44 + level * 72;
      const x = (width / (nodesAtLevel + 1)) * (posInLevel + 1);
      return { x, y };
    };

    const outputPoint = (outputIndex: number): Point => {
      const startX = Math.max(40, p.width / 2 - 120);
      return { x: startX + outputIndex * 42, y: p.height - 42 };
    };

    const drawNode = (
      value: number,
      x: number,
      y: number,
      mode: "normal" | "active" | "output" = "normal"
    ) => {
      p.fill(mode === "active" ? 0 : mode === "output" ? 0 : 0, 0, mode === "normal" ? 100 : 0);
      p.stroke(0, 0, mode === "normal" ? 72 : 0);
      p.strokeWeight(1.5);
      p.ellipse(x, y, 44, 44);
      p.fill(0, 0, mode === "normal" ? 0 : 100);
      p.textSize(14);
      p.text(value, x, y);
    };

    const drawHeap = (arr: number[], idx: number, skip: Set<number>) => {
      if (idx >= arr.length) return;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      const point = nodePoint(idx, p.width);

      if (left < arr.length) {
        const child = nodePoint(left, p.width);
        p.stroke(0, 0, 82);
        p.strokeWeight(1.5);
        p.line(point.x, point.y + 22, child.x, child.y - 22);
        drawHeap(arr, left, skip);
      }
      if (right < arr.length) {
        const child = nodePoint(right, p.width);
        p.stroke(0, 0, 82);
        p.strokeWeight(1.5);
        p.line(point.x, point.y + 22, child.x, child.y - 22);
        drawHeap(arr, right, skip);
      }

      if (!skip.has(idx)) {
        drawNode(arr[idx], point.x, point.y);
      }
    };

    p.draw = () => {
      p.background(0, 0, 98);
      const arr = heapRef.current;
      const extractedValues = extractedRef.current;
      const anim = animRef.current;
      const skip = new Set<number>();

      if (anim?.type === "swap") {
        skip.add(anim.fromIdx);
        skip.add(anim.toIdx);
      } else if (anim?.type === "to-output") {
        skip.add(anim.fromIdx);
      } else if (anim?.type === "last-to-root") {
        skip.add(0);
        skip.add(anim.fromIdx);
      }

      if (arr.length === 0) {
        p.fill(0, 0, 45);
        p.textSize(13);
        p.text("Empty heap", p.width / 2, p.height / 2);
      } else {
        drawHeap(arr, 0, skip);
      }

      if (anim) {
        const t = Math.min(1, (Date.now() - anim.start) / anim.duration);
        const eased = 1 - (1 - t) * (1 - t);

        if (anim.type === "swap") {
          const from = nodePoint(anim.fromIdx, p.width);
          const to = nodePoint(anim.toIdx, p.width);
          drawNode(
            anim.fromValue,
            p.lerp(from.x, to.x, eased),
            p.lerp(from.y, to.y, eased),
            "active"
          );
          drawNode(
            anim.toValue,
            p.lerp(to.x, from.x, eased),
            p.lerp(to.y, from.y, eased),
            "active"
          );
        } else if (anim.type === "to-output") {
          const from = nodePoint(anim.fromIdx, p.width);
          const to = outputPoint(anim.outputIndex);
          drawNode(anim.value, p.lerp(from.x, to.x, eased), p.lerp(from.y, to.y, eased), "active");
        } else if (anim.type === "last-to-root") {
          const from = nodePoint(anim.fromIdx, p.width);
          const to = nodePoint(0, p.width);
          drawNode(anim.value, p.lerp(from.x, to.x, eased), p.lerp(from.y, to.y, eased), "active");
        }
      }

      p.noStroke();
      p.fill(0, 0, 42);
      p.textSize(11);
      p.text("Extracted", p.width / 2, p.height - 78);
      extractedValues.forEach((value, index) => {
        const point = outputPoint(index);
        drawNode(value, point.x, point.y, "output");
      });
    };
  }, []);

  const bubbleUp = (arr: number[], idx: number): number[][] => {
    const steps: number[][] = [];
    const a = [...arr];
    let i = idx;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if ((isMax && a[i] > a[parent]) || (!isMax && a[i] < a[parent])) {
        [a[i], a[parent]] = [a[parent], a[i]];
        steps.push([...a]);
        i = parent;
      } else break;
    }
    return steps;
  };

  const bubbleDownSwaps = (arr: number[]): { from: number; to: number; next: number[] }[] => {
    const steps: { from: number; to: number; next: number[] }[] = [];
    const a = [...arr];
    let i = 0;
    const n = a.length;
    while (true) {
      let extreme = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;

      if (left < n && ((isMax && a[left] > a[extreme]) || (!isMax && a[left] < a[extreme]))) extreme = left;
      if (right < n && ((isMax && a[right] > a[extreme]) || (!isMax && a[right] < a[extreme]))) extreme = right;

      if (extreme !== i) {
        [a[i], a[extreme]] = [a[extreme], a[i]];
        steps.push({ from: i, to: extreme, next: [...a] });
        i = extreme;
      } else break;
    }
    return steps;
  };

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const insert = () => {
    const val = parseInt(insertVal);
    if (isNaN(val)) {
      setStatus("Type a whole number to insert.");
      return;
    }
    if (heap.length >= 15) {
      setStatus("The lab holds four levels (15 nodes). Extract or reset before inserting more.");
      return;
    }
    const newHeap = [...heap, val];
    setHeap(newHeap);
    setAnimating("up");

    const steps = bubbleUp(newHeap, newHeap.length - 1);
    setStatus(
      steps.length
        ? `Inserted ${val} as the last leaf; it moves up ${steps.length} ${steps.length === 1 ? "level" : "levels"} past ${isMax ? "smaller" : "larger"} parents.`
        : `Inserted ${val} as the last leaf; its parent already ${isMax ? "is at least as large" : "is no larger"}, so nothing moves.`
    );
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setHeap(steps[stepIdx]);
        heapRef.current = steps[stepIdx];
        stepIdx++;
      } else {
        clearInterval(interval);
        setAnimating(null);
        animRef.current = null;
      }
    }, 400);
    setInsertVal("");
  };

  const extract = async () => {
    if (heap.length <= 1) {
      setExtracted((current) => [...current, heap[0]].filter((value) => value !== undefined));
      setHeap([]);
      setStatus(`The heap is empty. The extracted row is in ${isMax ? "descending" : "ascending"} order. Reset to start again.`);
      return;
    }

    setAnimating("down");
    const rootValue = heap[0];
    const lastValue = heap[heap.length - 1];
    const lastIndex = heap.length - 1;
    const outputIndex = extracted.length;

    setStatus(`${rootValue} leaves the heap and moves to the extracted row.`);
    animRef.current = {
      type: "to-output",
      fromIdx: 0,
      value: rootValue,
      outputIndex,
      start: Date.now(),
      duration: MOVE_MS,
    };
    await wait(MOVE_MS);
    if (!mountedRef.current) return;
    setExtracted((current) => [...current, rootValue]);

    const newHeap = [lastValue, ...heap.slice(1, -1)];
    setHeap(newHeap);
    heapRef.current = newHeap;

    setStatus(`${lastValue} moves from the last leaf into the root hole.`);
    animRef.current = {
      type: "last-to-root",
      fromIdx: lastIndex,
      value: lastValue,
      start: Date.now(),
      duration: MOVE_MS,
    };
    await wait(MOVE_MS);
    if (!mountedRef.current) return;

    let currentHeap = newHeap;
    const steps = bubbleDownSwaps(newHeap);
    for (const step of steps) {
      setStatus(
        `${currentHeap[step.from]} swaps with ${currentHeap[step.to]} to restore the heap property.`
      );
      animRef.current = {
        type: "swap",
        fromIdx: step.from,
        toIdx: step.to,
        fromValue: currentHeap[step.from],
        toValue: currentHeap[step.to],
        start: Date.now(),
        duration: MOVE_MS,
      };
      await wait(MOVE_MS);
      if (!mountedRef.current) return;
      currentHeap = step.next;
      setHeap(currentHeap);
      heapRef.current = currentHeap;
    }

    setStatus("Heap property restored. Extract again to continue heap sort.");
    animRef.current = null;
    setAnimating(null);
  };

  const resetHeap = (nextIsMax = isMax) => {
    const nextHeap = nextIsMax ? MAX_HEAP_SAMPLE : MIN_HEAP_SAMPLE;
    setHeap(nextHeap);
    setExtracted([]);
    heapRef.current = nextHeap;
    extractedRef.current = [];
    animRef.current = null;
    setAnimating(null);
    setStatus("Extract moves the root out, moves the last node to root, then restores the heap.");
  };

  const toggleHeapKind = (checked: boolean) => {
    setIsMax(checked);
    resetHeap(checked);
  };

  return (
    <div className="space-y-4">
      <P5Wrapper sketch={sketch} className="min-h-[360px]" />

      <div className="flex flex-wrap items-center gap-2 justify-center">
        <input
          type="number"
          placeholder="Value"
          value={insertVal}
          onChange={(e) => setInsertVal(e.target.value)}
          className="ui-input w-20"
        />
        <button
          type="button"
          onClick={insert}
          disabled={animating !== null}
          className="ui-btn-primary disabled:opacity-40"
        >
          Insert
        </button>
        <button
          type="button"
          onClick={extract}
          disabled={animating !== null || heap.length === 0}
          className="ui-btn-secondary disabled:opacity-40"
        >
          Extract {isMax ? "Max" : "Min"}
        </button>
        <label className="ui-label flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={isMax}
            disabled={animating !== null}
            onChange={(e) => toggleHeapKind(e.target.checked)}
            className="accent-[var(--color-primary)]"
          />
          Max heap (switching resets)
        </label>
        <button
          type="button"
          onClick={() => resetHeap()}
          disabled={animating !== null}
          className="ui-btn-secondary disabled:opacity-40"
        >
          Reset
        </button>
      </div>
      <p className="ui-caption text-center">
        {isMax ? "Max" : "Min"} Heap · Size: {heap.length} · Root: {heap[0] ?? "—"}
      </p>
      <p className="text-center text-sm leading-[1.43] text-body">{status}</p>
    </div>
  );
}
