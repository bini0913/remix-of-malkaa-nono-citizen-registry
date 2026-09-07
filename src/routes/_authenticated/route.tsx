import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useHierarchy, useScope } from "@/hooks/use-scope";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  ShieldCheck,
  LogOut,
  Copy,
  ScrollText,
  Building2,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const t = useT();
  const { data: scope } = useScope();
  const { data: hierarchy } = useHierarchy();
  const navigate = useNavigate();

  const ROLE_LABEL: Record<string, string> = {
    subcity_admin: t("role.subcity_admin"),
    woreda_admin: t("role.woreda_admin"),
    zone_account: t("role.zone_account"),
  };

  const zone = hierarchy?.zones.find((z) => z.id === scope?.zoneId);
  const woredaId = scope?.woredaId ?? zone?.woreda_id ?? null;
  const woreda = hierarchy?.woredas.find((w) => w.id === woredaId);
  const placeParts = [t("app.subcity"), woreda?.name ? `${woreda.name} Woreda` : null, zone?.name ?? null].filter(
    Boolean,
  );

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const isAdmin = scope?.role === "subcity_admin" || scope?.role === "woreda_admin";
  const isSubcity = scope?.role === "subcity_admin";

  const nav = [
    { to: "/dashboard", label: isSubcity ? t("nav.commandCentre") : t("nav.dashboard"), icon: LayoutDashboard },
    ...(scope?.role === "zone_account" ? [{ to: "/register", label: t("nav.register"), icon: UserPlus }] : []),
    { to: "/residents", label: t("nav.residents"), icon: Users },
    ...(isAdmin
      ? [
          { to: "/establishments", label: t("nav.establishments"), icon: Building2 },
          { to: "/duplicates", label: t("nav.duplicates"), icon: Copy },
          { to: "/audit", label: t("nav.audit"), icon: ScrollText },
          { to: "/accounts", label: t("nav.accounts"), icon: ShieldCheck },
        ]
      : []),
    ...(isSubcity ? [{ to: "/reports", label: t("nav.reports"), icon: FileText }] : []),
  ] as const;


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <div className="mr-auto">
            <p className="text-sm font-semibold tracking-tight">{t("app.name")}</p>
            <p className="text-xs opacity-75">
              {ROLE_LABEL[scope?.role ?? ""] ?? t("role.none")} · {placeParts.join(" · ")} · {scope?.email}
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-sidebar-accent hover:opacity-100 [&.active]:bg-sidebar-accent [&.active]:opacity-100"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
            <LanguageSwitcher className="ml-1" />
            <Button variant="ghost" size="sm" onClick={signOut} className="ml-1 hover:bg-sidebar-accent">
              <LogOut className="size-4" />
              {t("nav.signOut")}
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 print:max-w-none print:p-0">
        <Outlet />
      </main>
    </div>
  );
}
