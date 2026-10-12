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
          <span className="font-medium text-ink">Interactive labs</span> for{" "}
          <span className="font-medium text-ink">Fundamentals of Data Structures in C</span>, chapter by chapter.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href={`/topics/${first.id}`} className="ui-btn-primary">
            Start at {first.bookChapter}
          </Link>
        </div>
      </div>
    </section>
  );
}
