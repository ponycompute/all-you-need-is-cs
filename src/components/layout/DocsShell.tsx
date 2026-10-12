import Link from "next/link";
import type { ReactNode } from "react";
import SidebarSections from "@/components/layout/SidebarSections";
import { PHASE1_TOPICS, type Topic } from "@/lib/topics";

function ChapterList({ activeId, withSections }: { activeId?: string; withSections: boolean }) {
  return (
    <ul className="space-y-px">
      {PHASE1_TOPICS.map((topic) => {
        const current = topic.id === activeId;
        return (
          <li key={topic.id}>
            <Link
              href={`/topics/${topic.id}`}
              aria-current={current ? "page" : undefined}
              className={`flex items-baseline gap-3 rounded-md px-2 py-1.5 text-sm leading-snug ${
                current ? "bg-surface-soft font-medium text-ink" : "text-charcoal hover:bg-surface-soft hover:text-ink"
              }`}
            >
              <span className="w-10 shrink-0 font-mono text-[11px] tabular-nums text-mute">{topic.bookChapter}</span>
              <span>{topic.title}</span>
            </Link>
            {current && withSections ? (
              <div className="ml-4">
                <SidebarSections items={topic.outline} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

const GROUP = "Data Structures";

/**
 * The site layout: a sidebar listing every chapter under its group, and the page beside it.
 * Pass the chapter being read as `topic`; the home page passes none.
 */
export default function DocsShell({ topic, children }: { topic?: Topic; children: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="hidden border-r border-hairline lg:block">
        <nav aria-label="Chapters" className="sticky top-0 flex max-h-screen flex-col overflow-y-auto px-4 py-6">
          <Link href="/" aria-current={topic ? undefined : "page"} className="mb-8 px-2 font-display text-[17px] font-medium leading-tight text-ink">
            All You Need is CS
          </Link>
          <h2 className="mb-2 px-2 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-mute">{GROUP}</h2>
          <ChapterList activeId={topic?.id} withSections />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <details className="group sticky top-0 z-20 border-b border-hairline bg-canvas lg:hidden">
          <summary className="flex h-12 cursor-pointer list-none items-center justify-between gap-3 px-6 text-sm [&::-webkit-details-marker]:hidden">
            {topic ? (
              <span className="truncate">
                <span className="font-mono text-xs text-mute">{topic.bookChapter}</span>
                <span className="ml-2 font-medium text-ink">{topic.title}</span>
              </span>
            ) : (
              <span className="truncate font-display font-medium text-ink">All You Need is CS</span>
            )}
            <span className="shrink-0 font-mono text-xs text-charcoal group-open:hidden">Chapters ↓</span>
            <span className="hidden shrink-0 font-mono text-xs text-charcoal group-open:inline">Close ↑</span>
          </summary>
          <nav aria-label="Chapters" className="max-h-[70vh] overflow-y-auto border-t border-hairline px-4 py-4">
            {topic ? (
              <Link href="/" className="mb-4 block px-2 text-sm font-medium text-ink underline decoration-hairline underline-offset-4">
                ← Home
              </Link>
            ) : null}
            <h2 className="mb-2 px-2 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-mute">{GROUP}</h2>
            <ChapterList activeId={topic?.id} withSections={false} />
          </nav>
        </details>

        {children}
      </div>
    </div>
  );
}
