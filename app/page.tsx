/**
 * Root entry. There is no marketing landing — Cofield is a tool, so the root
 * sends you where you're going: your boards if signed in, otherwise sign-in.
 */
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/server";

export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? "/boards" : "/signin");
}
