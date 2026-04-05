import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

// Redirect old /messages/[id] URLs to the unified messaging app
export default async function ConversationPage({ params }: Props) {
  const { id: conversationId } = await params;
  redirect(`/messages?c=${conversationId}`);
}
