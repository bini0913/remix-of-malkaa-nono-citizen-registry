import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(["woreda_admin", "zone_account"]),
  woredaId: z.string().uuid(),
  zoneId: z.string().uuid().nullable().optional(),
});

async function myRoleOf(supabase: { from: (t: "user_roles") => any }, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role, woreda_id, is_active")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || data.is_active === false) throw new Error("No active role assigned to your account.");
  return data as { role: string; woreda_id: string | null; is_active: boolean };
}

export const createStaffAccount = createServerFn({ method: "POST" })

  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const myRole = await myRoleOf(supabase, userId);
    if (data.role === "woreda_admin" && myRole.role !== "subcity_admin")
      throw new Error("Only a subcity administrator can create woreda administrators.");
    if (data.role === "zone_account") {
      if (myRole.role === "woreda_admin" && myRole.woreda_id !== data.woredaId)
        throw new Error("You can only create zone accounts inside your own woreda.");
      if (myRole.role === "zone_account") throw new Error("Zone accounts cannot create other accounts.");
      if (!data.zoneId) throw new Error("A zone must be selected for a zone account.");
      const { data: zone } = await supabase
        .from("zones")
        .select("id, woreda_id")
        .eq("id", data.zoneId)
        .maybeSingle();
      if (!zone || zone.woreda_id !== data.woredaId)
        throw new Error("The selected zone does not belong to the selected woreda.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create the account.");

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id,
      role: data.role,
      woreda_id: data.woredaId,
      zone_id: data.role === "zone_account" ? (data.zoneId ?? null) : null,
      created_by: userId,
    });
    if (roleError) throw new Error(roleError.message);

    return { ok: true, userId: created.user.id };
  });

/** Staff directory scoped to the caller's hierarchy, enriched with auth metadata. */
export const listStaffAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const me = await myRoleOf(supabase, userId);
    if (me.role === "zone_account") throw new Error("Zone registrars cannot manage accounts.");

    // RLS already limits these rows to the caller's scope.
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("id, user_id, role, woreda_id, zone_id, is_active, created_at, disabled_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const byId = new Map((list?.users ?? []).map((u) => [u.id, u]));

    return (roles ?? []).map((r) => {
      const u = byId.get(r.user_id);
      return {
        ...r,
        email: u?.email ?? null,
        fullName: (u?.user_metadata?.["full_name"] as string | undefined) ?? null,
        lastSignInAt: u?.last_sign_in_at ?? null,
      };
    });
  });

/** Accounts are never deleted — audit history must survive. They are disabled. */
export const setAccountActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ roleRowId: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const me = await myRoleOf(supabase, userId);

    const { data: target } = await supabase
      .from("user_roles")
      .select("id, user_id, role, woreda_id")
      .eq("id", data.roleRowId)
      .maybeSingle();
    if (!target) throw new Error("Account not found in your scope.");
    if (target.user_id === userId) throw new Error("You cannot change your own account status.");

    if (me.role === "subcity_admin") {
      if (target.role !== "woreda_admin")
        throw new Error("Subcity administrators manage woreda administrator accounts.");
    } else if (me.role === "woreda_admin") {
      if (target.role !== "zone_account" || target.woreda_id !== me.woreda_id)
        throw new Error("You can only manage zone registrars inside your own woreda.");
    } else {
      throw new Error("You are not allowed to manage accounts.");
    }

    const { error } = await supabase
      .from("user_roles")
      .update({
        is_active: data.active,
        disabled_at: data.active ? null : new Date().toISOString(),
        disabled_by: data.active ? null : userId,
      })
      .eq("id", data.roleRowId);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.auth.admin.updateUserById(target.user_id, {
      ban_duration: data.active ? "none" : "876000h",
    });

    return { ok: true };
  });
