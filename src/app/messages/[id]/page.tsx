import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ChatThread from "@/components/ChatThread";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { id: conversationId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // Verify user is a participant
  const { data: myParticipant } = await supabase
    .from("dm_participants")
    .select("id, last_read_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!myParticipant) notFound();

  // Get the other participant
  const { data: otherParticipant } = await supabase
    .from("dm_participants")
    .select("user_id, profiles(full_name, user_code, bio, role)")
    .eq("conversation_id", conversationId)
    .neq("user_id", user.id)
    .single();

  if (!otherParticipant) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profilesRaw = otherParticipant.profiles as any;
  const otherProfile = (Array.isArray(profilesRaw) ? profilesRaw[0] : profilesRaw) as {
    full_name: string | null;
    user_code: string | null;
    bio: string | null;
    role: string;
  } | null;

  // Get other user's public key
  const { data: otherKeys } = await supabase
    .from("user_keys")
    .select("public_key")
    .eq("user_id", otherParticipant.user_id)
    .single();

  // Get my keys
  const { data: myKeys } = await supabase
    .from("user_keys")
    .select("public_key, encrypted_private_key, key_salt")
    .eq("user_id", user.id)
    .single();

  // Get user profile for navbar
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  // Load initial messages (last 50)
  const { data: messages } = await supabase
    .from("dm_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  // Get pending delegations for navbar
  const { count: pendingDelegations } = await supabase
    .from("delegations")
    .select("id", { count: "exact", head: true })
    .eq("delegate_id", user.id)
    .eq("status", "pending");

  return (
    <div className="min-h-screen bg-[#0c1220] flex flex-col">
      <Navbar
        userEmail={user.email}
        userName={profile?.full_name}
        userRole={profile?.role}
        pendingDelegations={pendingDelegations || 0}
      />
      <ChatThread
        conversationId={conversationId}
        userId={user.id}
        myPublicKey={myKeys?.public_key || null}
        myEncryptedPrivateKey={myKeys?.encrypted_private_key || null}
        myKeySalt={myKeys?.key_salt || null}
        otherUserId={otherParticipant.user_id}
        otherUserName={otherProfile?.full_name || null}
        otherUserCode={otherProfile?.user_code || null}
        otherUserPublicKey={otherKeys?.public_key || null}
        initialMessages={(messages || []).reverse()}
      />
    </div>
  );
}
