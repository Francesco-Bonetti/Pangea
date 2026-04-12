import { redirect } from "next/navigation";

export default function DelegationsRedirect() {
  redirect("/dashboard/delegations");
}
