import { createFileRoute } from "@tanstack/react-router";
import { PersonForm } from "@/components/PersonForm";
import { useScope } from "@/hooks/use-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/register")({
  head: () => ({
    meta: [
      { title: "Register a Resident | Malkaa Nono Registry" },
      {
        name: "description",
        content:
          "Age-tier adaptive registration form for residents of Malkaa Nono Subcity, covering contacts, guardians and National ID capture.",
      },
      { property: "og:title", content: "Register a Resident | Malkaa Nono Registry" },
      { property: "og:description", content: "Age-tier adaptive resident registration for Malkaa Nono Subcity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const t = useT();
  const { data: scope, isLoading } = useScope();

  if (isLoading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;

  if (scope?.role !== "zone_account") {
    const roleLabel =
      scope?.role === "subcity_admin"
        ? t("role.subcity_admin")
        : scope?.role === "woreda_admin"
          ? t("role.woreda_admin")
          : t("register.noRole");
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            {t("register.blockedTitle")}
          </CardTitle>
          <CardDescription>{t("register.blockedBody", { role: roleLabel })}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t("register.blockedNote")}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("register.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("register.subtitle")}</p>
      </header>
      <PersonForm />
    </div>
  );
}
