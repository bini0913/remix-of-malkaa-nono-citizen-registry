import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff Sign In | Malkaa Nono Resident Registry" },
      {
        name: "description",
        content:
          "Secure sign in for Malkaa Nono Subcity registry staff — subcity administrators, woreda administrators and zone registrars.",
      },
      { property: "og:title", content: "Staff Sign In | Malkaa Nono Resident Registry" },
      {
        property: "og:description",
        content: "Secure sign in for Malkaa Nono Subcity resident registration staff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { setup?: boolean } =>
    s['setup'] === true || s['setup'] === "true" ? { setup: true } : {},

  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { setup } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "setup">(setup ? "setup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          toast.success("Account created. Please sign in.");
          setMode("signin");
          return;
        }
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Malkaa Nono Subcity Resident Registry
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Sheger City · Oromia · Official records system</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{mode === "signin" ? "Staff sign in" : "Create subcity administrator"}</CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Use the credentials issued by your administrator."
                : "The first account created becomes the Subcity Administrator."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {mode === "setup" && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create administrator account"}
              </Button>
            </form>
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "setup" : "signin")}
              className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              {mode === "signin" ? "First-time setup — create the subcity administrator" : "Back to sign in"}
            </button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
