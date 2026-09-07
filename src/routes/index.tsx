import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Users, FileText } from "lucide-react";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Malkaa Nono Subcity Resident Registration System" },
      {
        name: "description",
        content:
          "Official resident registration and records system for Malkaa Nono Subcity, Sheger City, Oromia — role-based registration, reporting and audit trail.",
      },
      { property: "og:title", content: "Malkaa Nono Subcity Resident Registration System" },
      {
        property: "og:description",
        content: "Official resident registration and records system for Malkaa Nono Subcity, Sheger City, Oromia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const t = useT();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  const features = [
    { icon: Users, title: t("home.f1.title"), body: t("home.f1.body") },
    { icon: ShieldCheck, title: t("home.f2.title"), body: t("home.f2.body") },
    { icon: FileText, title: t("home.f3.title"), body: t("home.f3.body") },
  ];

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-sidebar px-4 py-20 text-sidebar-foreground">
        <div className="mx-auto flex max-w-3xl justify-end">
          <LanguageSwitcher />
        </div>
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">{t("app.longName")}</h1>
          <p className="mt-3 text-sm opacity-85 sm:text-base">{t("app.subtitle")}</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to={signedIn ? "/dashboard" : "/auth"}>{signedIn ? t("home.cta.dashboard") : t("home.cta.signIn")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-16 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-lg border border-border bg-card p-6">
            <f.icon className="size-5 text-primary" />
            <h2 className="mt-3 text-base font-semibold text-card-foreground">{f.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
