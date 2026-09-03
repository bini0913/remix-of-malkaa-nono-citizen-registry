import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Users, FileText } from "lucide-react";

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
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-sidebar px-4 py-20 text-sidebar-foreground">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
            Malkaa Nono Subcity Resident Registration System
          </h1>
          <p className="mt-3 text-sm opacity-85 sm:text-base">
            Sheger City · Oromia, Ethiopia — an official record of every resident, maintained by subcity, woreda and zone
            administrations.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to={signedIn ? "/dashboard" : "/auth"}>{signedIn ? "Open dashboard" : "Staff sign in"}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-16 md:grid-cols-3">
        {[
          {
            icon: Users,
            title: "Age-tier registration",
            body: "Forms adapt automatically from the date of birth — baby, child, youth, adult and elder tiers.",
          },
          {
            icon: ShieldCheck,
            title: "Strict role hierarchy",
            body: "Subcity, woreda and zone accounts each see only the residents inside their own scope.",
          },
          {
            icon: FileText,
            title: "Permanent audit trail",
            body: "Nothing is ever deleted. Every creation and correction is recorded with who changed what and when.",
          },
        ].map((f) => (
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
