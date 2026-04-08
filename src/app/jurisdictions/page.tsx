import { redirect } from "next/navigation";

export default function JurisdictionsRedirect() {
  redirect("/groups?type=jurisdiction");
}
