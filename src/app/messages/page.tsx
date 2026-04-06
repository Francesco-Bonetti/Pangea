import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import MessagesClient from "@/components/MessagesClient";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
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
    // Get all participants for these conversations (separate queries - no cross-schema joins)
    const { data: allParticipants } = await supabase
      .from("dm_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", conversationIds);

    // Get conversations metadata
    const { data: convData } = await supabase
      .from("dm_conversations")
      .select("id, last_message_at")
      .in("id", conversationIds)
      .order("last_message_at", { ascending: false });

    // Get public keys for other users
    const otherUserIds = (allParticipants || [])
      .filter((p: { user_id: string }) => p.user_id !== user.id)
      .map((p: { user_id: string }) => p.user_id);

    // Get profiles for other users (direct query, no embedded join)
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

    // Build conversation list
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
        unread_count: 0, // will be computed client-side
      };
    })
  );

  // Pending delegations for navbar badge
  const { count: pendingDelegations } = await supabase
    .from("delegations")
    .select("id", { count: "exact", head: true })
    .eq("delegate_id", user.id)
    .eq("status", "pending");

  return (
    <AppShell userEmail={user.email} userName={profile?.full_name} userRole={profile?.role} pendingDelegations={pendingDelegations || 0}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MessagesClient
          userId={user.id}
          userKeys={userKeys}
          conversations={conversationsWithLastMsg}
        />
      </div>
    </AppShell>
  );
}
