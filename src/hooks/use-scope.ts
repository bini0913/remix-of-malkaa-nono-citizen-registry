import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "subcity_admin" | "woreda_admin" | "zone_account";

export interface Scope {
  userId: string;
  email: string | null;
  role: AppRole | null;
  woredaId: string | null;
  zoneId: string | null;
}

export function useScope() {
  return useQuery({
    queryKey: ["scope"],
    queryFn: async (): Promise<Scope | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role, woreda_id, zone_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      return {
        userId: auth.user.id,
        email: auth.user.email ?? null,
        role: (data?.role as AppRole) ?? null,
        woredaId: data?.woreda_id ?? null,
        zoneId: data?.zone_id ?? null,
      };
    },
  });
}

export function useHierarchy() {
  return useQuery({
    queryKey: ["hierarchy"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [{ data: woredas }, { data: zones }] = await Promise.all([
        supabase.from("woredas").select("id, name").order("name"),
        supabase.from("zones").select("id, name, woreda_id").order("name"),
      ]);
      return { woredas: woredas ?? [], zones: zones ?? [] };
    },
  });
}

/** Zones the signed-in account may register residents into. */
export function useAllowedZones() {
  const { data: scope } = useScope();
  const { data: hierarchy } = useHierarchy();
  const zones = hierarchy?.zones ?? [];
  if (!scope || !scope.role) return [];
  if (scope.role === "subcity_admin") return zones;
  if (scope.role === "woreda_admin") return zones.filter((z) => z.woreda_id === scope.woredaId);
  return zones.filter((z) => z.id === scope.zoneId);
}

/**
 * Role capabilities. These mirror the database policies exactly — the server is
 * the enforcement boundary, this only keeps the interface honest.
 */
export function usePermissions() {
  const { data: scope } = useScope();
  const role = scope?.role ?? null;
  const isSubcity = role === "subcity_admin";
  const isWoreda = role === "woreda_admin";
  const isRegistrar = role === "zone_account";
  return {
    role,
    isSubcity,
    isWoreda,
    isRegistrar,
    /** Register brand-new residents (zone registrars only, own zone). */
    canRegister: isRegistrar,
    /** Correct existing records, change vital status, verify, resolve duplicates. */
    canEdit: isSubcity || isWoreda,
    canAddLifeEvent: isSubcity || isWoreda,
    canVerify: isSubcity || isWoreda,
    canResolveDuplicates: isSubcity || isWoreda,
    canManageAccounts: isSubcity || isWoreda,
    canImport: isSubcity || isWoreda,
    canViewAudit: isSubcity || isWoreda,
  };
}
