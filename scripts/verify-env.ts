#!/usr/bin/env bun
/**
 * Pre-build environment variable check for Vercel + Lovable Cloud deployments.
 * Run this before `vite build` so missing variables fail with a clear message
 * instead of a cryptic runtime Supabase error.
 */

const requiredPublic = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
const requiredServer = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"];
const optionalButRecommended = [
  "VITE_SUPABASE_PROJECT_ID",
  "SUPABASE_PROJECT_ID",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function missing(vars: string[]): string[] {
  return vars.filter((key) => {
    const value = process.env[key];
    return !value || value.trim() === "";
  });
}

const missingPublic = missing(requiredPublic);
const missingServer = missing(requiredServer);

if (missingPublic.length || missingServer.length) {
  console.error("\n❌ Missing environment variables for Vercel + Lovable Cloud\n");

  if (missingPublic.length) {
    console.error("Public variables (bundled into the browser by Vite):");
    missingPublic.forEach((key) => console.error(`  • ${key}`));
    console.error("");
  }

  if (missingServer.length) {
    console.error("Server-side variables (used by createServerFn / SSR):");
    missingServer.forEach((key) => console.error(`  • ${key}`));
    console.error("");
  }

  console.error("Copy the values from your local .env file into Vercel:");
  console.error("  Vercel Dashboard → Project → Settings → Environment Variables\n");
  console.error(
    "If you do not have a local .env, open the Lovable editor and copy the backend credentials from Project Settings.\n",
  );

  process.exit(1);
}

const missingOptional = missing(optionalButRecommended);
if (missingOptional.length) {
  console.warn("\n⚠️  Optional environment variables not set:");
  missingOptional.forEach((key) => console.warn(`  • ${key}`));
  console.warn("The build will continue, but some features may be limited.\n");
}

console.log("✅ Environment variables verified for Vercel + Lovable Cloud deployment.\n");
