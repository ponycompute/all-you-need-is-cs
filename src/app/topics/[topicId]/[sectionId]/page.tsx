import { notFound, redirect } from "next/navigation";
import { getAllTopicSectionParams, getTopicSection } from "@/lib/topics";

type Props = { params: Promise<{ topicId: string; sectionId: string }> };

export function generateStaticParams() {
  return getAllTopicSectionParams();
}

/** Sections used to have their own pages; each now lives on its chapter's page, so old links land on its anchor. */
export default async function TopicSectionPage({ params }: Props) {
  const { topicId, sectionId } = await params;
  if (!getTopicSection(topicId, sectionId)) notFound();
  redirect(`/topics/${topicId}#${sectionId}`);
}
