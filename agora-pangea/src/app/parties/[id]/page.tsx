import { redirect } from "next/navigation";

export default function PartyDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/groups/${params.id}`);
}
