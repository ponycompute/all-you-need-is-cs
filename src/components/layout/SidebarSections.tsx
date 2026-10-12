"use client";

import { useEffect, useState } from "react";
import type { BookOutlineItem } from "@/lib/topics";

/** The open chapter's sections in the sidebar; the one being read is marked as the page scrolls. */
export default function SidebarSections({ items }: { items: BookOutlineItem[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => node !== null);
    if (!sections.length) return;
    // A section is "being read" once its heading has passed the upper third of the viewport.
    const update = () => {
      const line = window.innerHeight * 0.3;
      let current = sections[0]!.id;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line) current = section.id;
        else break;
      }
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items]);

  return (
    <ol className="mb-2 mt-1 space-y-px border-l border-hairline">
      {items.map((item) => {
        const nested = item.id.split("-").length > 2;
        const current = item.id === active;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={current ? "location" : undefined}
              className={`-ml-px flex gap-2 border-l py-1 pr-2 text-[13px] leading-snug ${nested ? "pl-6" : "pl-3"} ${
                current ? "border-ink font-medium text-ink" : "border-transparent text-body hover:text-ink"
              }`}
            >
              <span className="shrink-0 font-mono text-[11px] leading-[1.5] tabular-nums text-mute">{item.label.replace("§", "")}</span>
              <span>{item.title}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
