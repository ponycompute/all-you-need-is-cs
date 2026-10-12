import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChapterPageView from "@/components/layout/ChapterPageView";
import DocsShell from "@/components/layout/DocsShell";
import { getTopic, PHASE1_TOPICS } from "@/lib/topics";

type Props = { params: Promise<{ topicId: string }> };

export function generateStaticParams() {
  return PHASE1_TOPICS.map((t) => ({ topicId: t.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topicId } = await params;
  const topic = getTopic(topicId);
  if (!topic) return { title: "Not found" };
  return {
    title: `${topic.bookChapter} · ${topic.title} — All You Need is CS`,
    description: topic.subtitle,
  };
}

export default async function TopicPage({ params }: Props) {
  const { topicId } = await params;
  const topic = getTopic(topicId);
  if (!topic) notFound();

  return (
    <DocsShell topic={topic}>
      <ChapterPageView topic={topic} />
    </DocsShell>
  );
}
