import Link from "next/link";
import { PHASE1_TOPICS } from "@/lib/topics";

export default function Hero() {
  const first = PHASE1_TOPICS[0]!;
  return (
    <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-6 py-16 md:py-[88px]">
      <div className="relative z-10 max-w-[720px] text-center">
        <h1 className="font-display text-[1.75rem] font-medium leading-[1.15] text-ink sm:text-[2.25rem] sm:leading-[1.11]">
          All You Need is Computer Science
        </h1>

        <p className="mt-6 text-base leading-normal text-body md:text-[16px] md:leading-[1.5]">
          Chapter-shaped{" "}
          <span className="font-medium text-ink">interactive labs</span> for{" "}
          <span className="font-medium text-ink">
            Fundamentals of Data Structures in C
          </span>{" "}
          (Horowitz, Sahni &amp; Anderson-Freed, 2nd ed.)—same flat doc-like layout, less
          slideshow, more structure.
        </p>

        <div className="mt-8 flex justify-center px-2">
          <div className="ui-install-snippet overflow-x-auto">
            <code className="whitespace-nowrap">npm run dev</code>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href={`/topics/${first.id}`} className="ui-btn-primary">
            Start at {first.bookChapter}
          </Link>
          <span className="ui-caption text-mute">
            Ch. 1–10 · 10 topics
          </span>
        </div>
      </div>
    </section>
  );
}
