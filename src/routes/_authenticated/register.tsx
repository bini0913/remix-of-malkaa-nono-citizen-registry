import { createFileRoute } from "@tanstack/react-router";
import { PersonForm } from "@/components/PersonForm";
import { useScope } from "@/hooks/use-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

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
  const { data: scope, isLoading } = useScope();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (scope?.role !== "zone_account") {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            Registration is performed by zone accounts only
          </CardTitle>
          <CardDescription>
            New residents are registered house by house by the zone registrar. As a{" "}
            {scope?.role === "subcity_admin"
              ? "subcity administrator"
              : scope?.role === "woreda_admin"
                ? "woreda administrator"
                : "user without a registration role"}
            , you can still view, correct and report on records within your scope, but you cannot create a new resident
            record.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This restriction is enforced in the database as well as in this interface.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Register a resident</h1>
        <p className="text-sm text-muted-foreground">
          The form adapts to the age tier computed from the date of birth. Records can be corrected later, never deleted.
        </p>
      </header>
      <PersonForm />
    </div>
  );
}
