/**
 * Teams aren't built yet (Org → Team → Board is a later milestone). Until then,
 * route any team URL to the board list rather than show a dead page.
 */
import { redirect } from "next/navigation";

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  await params;
  redirect("/boards");
}
