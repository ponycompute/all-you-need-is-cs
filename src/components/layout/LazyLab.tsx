"use client";

import { useEffect, useRef, useState } from "react";
import SectionLab from "@/components/layout/SectionLab";

/** How far outside the viewport a lab is still kept mounted. */
const MARGIN = "500px 0px";
const PLACEHOLDER = 420;

/**
 * Mounts a section's lab the first time it comes near the viewport and keeps it
 * from then on, so whatever the reader built in it is still there when they
 * scroll back. Labs further down the page cost nothing until they are reached.
 */
export default function LazyLab({ topicId, sectionId }: { topicId: string; sectionId: string }) {
  const slot = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = slot.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[entries.length - 1]?.isIntersecting) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={slot} id={`${sectionId}-lab`} className="scroll-mt-8" style={near ? undefined : { minHeight: PLACEHOLDER }}>
      {near ? <SectionLab topicId={topicId} sectionId={sectionId} /> : null}
    </div>
  );
}
