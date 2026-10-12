import Link from "next/link";
import AnchorKeeper from "@/components/layout/AnchorKeeper";
import LazyLab from "@/components/layout/LazyLab";
import { labKeyOf } from "@/lib/labs";
import { getChapterIntro, getSectionBridge, getSectionProse } from "@/lib/sectionProse";
import { PHASE1_TOPICS, type BookOutlineItem, type Topic } from "@/lib/topics";

const complexityLabels: Record<Topic["complexity"], string> = {
  easy: "Beginner",
  medium: "Intermediate",
  hard: "Advanced",
};

/** A whole chapter on one page: every § in order, each with its summary and, once per distinct lab, the lab. */
export default function ChapterPageView({ topic }: { topic: Topic }) {
  const index = PHASE1_TOPICS.findIndex((item) => item.id === topic.id);
  const prev = PHASE1_TOPICS[index - 1];
  const next = PHASE1_TOPICS[index + 1];
  const intro = getChapterIntro(topic);

  // The first section to use a lab mounts it; later sections that share it point back.
  const firstWith = new Map<string, BookOutlineItem>();
  const sections = topic.outline.map((section) => {
    const key = labKeyOf(topic.id, section.id);
    const owner = key ? firstWith.get(key) : undefined;
    if (key && !owner) firstWith.set(key, section);
    return { section, hasLab: Boolean(key) && !owner, sharedWith: owner };
  });

  return (
    <article className="px-6 py-12 md:py-16">
      <AnchorKeeper />
      <div className="mx-auto w-full max-w-[720px]">
        <header className="mb-14">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm font-medium text-ink">{topic.bookChapter}</span>
            <span className="rounded-full bg-surface-soft px-3 py-1 font-mono text-xs font-medium text-charcoal">
              {complexityLabels[topic.complexity]}
            </span>
            <span className="font-mono text-xs text-mute">{topic.outline.length} sections</span>
          </div>
          <h1 className="font-display text-[1.875rem] font-medium leading-[1.2] text-ink md:text-[34px]">{topic.title}</h1>
          <p className="mt-4 max-w-xl text-base leading-[1.5] text-body">{topic.subtitle}</p>
          {intro ? <p className="mt-6 border-l-2 border-ink pl-4 text-base leading-[1.6] text-charcoal">{intro}</p> : null}
        </header>

        {sections.map(({ section, hasLab, sharedWith }) => {
          const nested = section.id.split("-").length > 2;
          const bridge = getSectionBridge(section);
          return (
            <section key={section.id} id={section.id} className={`scroll-mt-16 border-t border-hairline lg:scroll-mt-8 ${nested ? "py-10" : "py-12"}`}>
              <div className="mb-5 flex items-baseline gap-4">
                <a href={`#${section.id}`} className="shrink-0 font-mono text-sm tabular-nums text-mute hover:text-ink">
                  {section.label}
                </a>
                <h2 className={`font-display font-medium leading-[1.25] text-ink ${nested ? "text-[20px]" : "text-[24px]"}`}>{section.title}</h2>
              </div>

              {bridge ? <p className="mb-4 text-base font-medium leading-[1.5] text-ink">{bridge}</p> : null}
              <div className="space-y-4 text-base leading-[1.5] text-body">
                {getSectionProse(topic, section).map((paragraph, at) => (
                  <p key={at}>{paragraph}</p>
                ))}
              </div>

              {hasLab ? (
                <div className="mt-8">
                  <LazyLab topicId={topic.id} sectionId={section.id} />
                </div>
              ) : null}
              {sharedWith ? (
                <p className="mt-6 font-mono text-xs text-mute">
                  <a href={`#${sharedWith.id}-lab`} className="text-charcoal underline decoration-hairline underline-offset-4 hover:text-ink hover:decoration-ink">
                    Try it in the lab under {sharedWith.label} ↑
                  </a>
                </p>
              ) : null}
            </section>
          );
        })}

        <nav aria-label="Previous and next chapter" className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-8 font-mono text-sm">
          {prev ? (
            <Link href={`/topics/${prev.id}`} className="text-ink underline decoration-hairline underline-offset-4 hover:decoration-ink">
              ← {prev.bookChapter} {prev.title}
            </Link>
          ) : (
            <span className="text-mute">←</span>
          )}
          {next ? (
            <Link href={`/topics/${next.id}`} className="text-right text-ink underline decoration-hairline underline-offset-4 hover:decoration-ink">
              {next.bookChapter} {next.title} →
            </Link>
          ) : (
            <span className="text-mute">→</span>
          )}
        </nav>
      </div>
    </article>
  );
}
