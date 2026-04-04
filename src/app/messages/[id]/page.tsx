import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ChatThread from "@/components/ChatThread";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function ConversationNotFound({ reason }: { reason: string }) {
  return (
    <div className="min-h-screen bg-[#0c1220] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/80 border border-slate-700 rounded-xl p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          Conversation unavailable
        </h2>
        <p className="text-slate-400 text-sm mb-6">{reason}</p>
        <Link
          href="/messages"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Messages
        </Link>
      </div>
    </div>
  );
}

export default async function ConversationPage({ params }: Props) {
  const { id: conversationId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // Verify user is a participant (separate query, no joins)
  const { data: myParticipant, error: myError } = await supabase
    .from("dm_participants")
    .select("id, last_read_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!myParticipant || myError) {
    return (
      <ConversationNotFound reason="This conversation does not exist or you are not a participant." />
    );
  }

  // Get the other participant (NO embedded profiles join - avoids PostgREST cross-schema issues)
  const { data: otherParticipant, error: otherError } = await supabase
    .from("dm_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", user.id)
    .single();

  if (!otherParticipant || otherError) {
    return (
      <ConversationNotFound reason="The other participant in this conversation could not be found." />
    );
  }

  // Get the other user's profile separately (direct query, reliable)
  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("full_name, user_code, bio, role")
    .eq("id", otherParticipant.user_id)
    .single();

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
    <AppShell userEmail={user.email} userName={profile?.full_name} userRole={profile?.role} pendingDelegations={pendingDelegations || 0}>
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
    </AppShell>
  );
}
