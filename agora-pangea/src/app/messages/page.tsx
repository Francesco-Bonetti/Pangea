import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import MessagingApp from "@/components/MessagingApp";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ c?: string }>;
}

export default async function MessagesPage({ searchParams }: Props) {
  const { c: conversationId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  // Get user's encryption keys
  const { data: userKeys } = await supabase
    .from("user_keys")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Get conversations with participants
  const { data: participantRows } = await supabase
    .from("dm_participants")
    .select("conversation_id, last_read_at, is_muted")
    .eq("user_id", user.id)
    .limit(200);

  const conversationIds = (participantRows || []).map(
    (p: { conversation_id: string }) => p.conversation_id
  );

  let conversations: {
    id: string;
    last_message_at: string;
    other_user_id: string;
    other_user_name: string | null;
    other_user_code: string | null;
    other_user_public_key: string | null;
    last_read_at: string;
    is_muted: boolean;
  }[] = [];

  if (conversationIds.length > 0) {
    const { data: allParticipants } = await supabase
      .from("dm_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", conversationIds);

    const { data: convData } = await supabase
      .from("dm_conversations")
      .select("id, last_message_at")
      .in("id", conversationIds)
      .order("last_message_at", { ascending: false });

    const otherUserIds = (allParticipants || [])
      .filter((p: { user_id: string }) => p.user_id !== user.id)
      .map((p: { user_id: string }) => p.user_id);

    const { data: otherProfiles } = otherUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, user_code")
          .in("id", otherUserIds)
      : { data: [] };

    const profileMap = new Map(
      (otherProfiles || []).map((p: { id: string; full_name: string | null; user_code: string | null }) => [p.id, p])
    );

    const { data: otherKeys } = otherUserIds.length > 0
      ? await supabase
          .from("user_keys")
          .select("user_id, public_key")
          .in("user_id", otherUserIds)
      : { data: [] };

    const keyMap = new Map(
      (otherKeys || []).map((k: { user_id: string; public_key: string }) => [k.user_id, k.public_key])
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conversations = (convData || []).map((conv: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const otherParticipant = (allParticipants || []).find(
        (p: any) => p.conversation_id === conv.id && p.user_id !== user.id
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const myParticipant = (participantRows || []).find(
        (p: any) => p.conversation_id === conv.id
      );

      const otherProfile = otherParticipant
        ? profileMap.get(otherParticipant.user_id) as { id: string; full_name: string | null; user_code: string | null } | undefined
        : undefined;

      return {
        id: conv.id,
        last_message_at: conv.last_message_at,
        other_user_id: otherParticipant?.user_id || "",
        other_user_name: otherProfile?.full_name || null,
        other_user_code: otherProfile?.user_code || null,
        other_user_public_key: otherParticipant
          ? keyMap.get(otherParticipant.user_id) || null
          : null,
        last_read_at: myParticipant?.last_read_at || conv.last_message_at,
        is_muted: myParticipant?.is_muted || false,
      };
    });
  }

  // Get last message for each conversation
  const conversationsWithLastMsg = await Promise.all(
    conversations.map(async (conv) => {
      const { data: lastMsg } = await supabase
        .from("dm_messages")
        .select("id, sender_id, encrypted_content, nonce, created_at, message_type, deleted_at")
        .eq("conversation_id", conv.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        ...conv,
        last_message: lastMsg || null,
        unread_count: 0,
      };
    })
  );

  // If a conversation is selected via query param, pre-load its data
  let initialChatData = null;
  if (conversationId) {
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) {
      const { data: msgs } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

      initialChatData = {
        otherUserId: conv.other_user_id,
        otherUserName: conv.other_user_name,
        otherUserCode: conv.other_user_code,
        otherUserPublicKey: conv.other_user_public_key,
        messages: (msgs || []).reverse(),
      };
    }
  }

  // Pending delegations for navbar badge
  const { count: pendingDelegations } = await supabase
    .from("delegations")
    .select("id", { count: "exact", head: true })
    .eq("delegate_id", user.id)
    .eq("status", "pending");

  return (
    <AppShell userEmail={user.email} userName={profile?.full_name} userRole={profile?.role} pendingDelegations={pendingDelegations || 0}>
      <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><span className="animate-spin w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full" /></div>}>
        <MessagingApp
          userId={user.id}
          userKeys={userKeys}
          conversations={conversationsWithLastMsg}
          initialConversationId={conversationId}
          initialChatData={initialChatData}
        />
      </Suspense>
    </AppShell>
  );
}
