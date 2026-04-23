import { redirect } from "next/navigation";

/** BUG-002: /app/sessions never existed — redirect to the combats dashboard */
export default function SessionsRedirect() {
  redirect("/app/dashboard/combats");
}
