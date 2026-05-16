"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { bootstrapOwnerWorkspace } from "@/lib/workspace";

function readRequired(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

export async function createAccountAction(formData: FormData) {
  const workspaceName = readRequired(formData, "workspaceName");
  const email = readRequired(formData, "email");
  const password = readRequired(formData, "password");
  const phoneValue = formData.get("phone");
  const displayNameValue = formData.get("displayName");
  const supabase = await createSupabaseServerClient();

  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        workspace_name: workspaceName,
        display_name: typeof displayNameValue === "string" ? displayNameValue : undefined
      }
    }
  });

  if (result.error || !result.data.user) {
    redirect(`/register?error=${encodeURIComponent(result.error?.message ?? "Unable to create account")}`);
  }

  await bootstrapOwnerWorkspace({
    user: result.data.user,
    workspaceName,
    phone: typeof phoneValue === "string" && phoneValue.trim() ? phoneValue.trim() : null,
    displayName: typeof displayNameValue === "string" && displayNameValue.trim() ? displayNameValue.trim() : null
  });

  redirect("/");
}
