"use server";

import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/auth/session.server";

export async function logout(): Promise<never> {
  await deleteSession();
  redirect("/login");
}
