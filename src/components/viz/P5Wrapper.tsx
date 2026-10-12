"use client";

import { useEffect, useRef } from "react";
import type p5 from "p5";

export type SketchFunction = (p: p5) => void;

/** The narrowest canvas the sketches were laid out for. */
const MIN_LOGICAL_WIDTH = 686;

interface P5WrapperProps {
  sketch: SketchFunction;
  className?: string;
  onReady?: () => void;
}

/**
 * P5Wrapper — React wrapper for p5.js in instance mode.
 *
 * Mounts a p5 instance into a div container. The sketch function receives
 * the p5 instance object. Cleanup is automatic on unmount.
 *
 * To use with dynamic width: the canvas resizes to the container's width
 * on mount. The sketch should use p.width/p.height accordingly.
 */
export default function P5Wrapper({
  sketch,
  className,
  onReady,
}: P5WrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<p5 | null>(null);
  /** Bumps on cleanup so in-flight async mounts (after dynamic import) do not attach a second p5 instance. */
  const mountGenRef = useRef(0);

  useEffect(() => {
    const mountId = ++mountGenRef.current;

    (async () => {
      const P5 = (await import("p5")).default;
      if (mountId !== mountGenRef.current) return;

      const el = containerRef.current;
      if (!el) return;

      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
      }
      el.replaceChildren();

      const rect = el.getBoundingClientRect();

      const wrappedSketch = (p: p5) => {
        // Sketches lay out in absolute pixels for a desktop column. On a narrower container
        // the canvas keeps that logical size and CSS scales it down, so nothing is cut off.
        const logicalWidth = Math.max(rect.width, MIN_LOGICAL_WIDTH);
        (p as any)._containerWidth = logicalWidth;
        (p as any)._containerHeight = Math.min(logicalWidth * 0.6, 600);

        const userSetup = (sketch as any).setup;
        sketch(p);

        const originalSetup = p.setup;

        p.setup = () => {
          p.createCanvas(
            (p as any)._containerWidth,
            (p as any)._containerHeight
          );
          p.pixelDensity(1);
          if (userSetup) {
            userSetup.call(p);
          }
          if (originalSetup && originalSetup !== userSetup) {
            originalSetup.call(p);
          }
        };

        if (!p.draw) {
          p.noLoop();
        }
      };

      if (mountId !== mountGenRef.current) return;

      instanceRef.current = new P5(wrappedSketch, el);
      onReady?.();
    })();

    return () => {
      mountGenRef.current += 1;
      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
      }
      containerRef.current?.replaceChildren();
    };
  }, [sketch, onReady]);

  return (
    <div
      ref={containerRef}
      className={`p5-canvas-container w-full ${className ?? ""}`}
    />
  );
}