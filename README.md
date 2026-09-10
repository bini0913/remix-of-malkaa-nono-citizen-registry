# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Development

```sh
git clone <this-repository-url>
cd <repository-name>
bun install
bun run dev
```

## Deploy to Vercel (frontend) + Lovable Cloud (backend)

This app uses **Vercel** for hosting and **Lovable Cloud** for the database, auth, and storage.

### 1. Push the repository to GitHub

Make sure `.env` is **not** committed (it is already in `.gitignore`).

### 2. Import into Vercel

1. Go to [vercel.com](https://vercel.com) and create a new project.
2. Import the GitHub repository.
3. Vercel will read `vercel.json`, so the build/install/output settings are already locked in:
   - **Install Command:** `bun install`
   - **Build Command:** `bun run build:vercel`
   - **Output Directory:** `.vercel/output`
   - **Framework Preset:** `Other` (`framework: null`)

### 3. Add environment variables

In the Vercel project, go to **Settings → Environment Variables** and add every variable from `.env.example`.

The easiest way is to copy the values from the `.env` file in this project root (created by Lovable Cloud):

| Variable | Type | Purpose |
|----------|------|---------|
| `VITE_SUPABASE_URL` | Public | Lovable Cloud project URL (used in the browser bundle) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public | Anonymous/public API key (used in the browser bundle) |
| `VITE_SUPABASE_PROJECT_ID` | Public | Project reference ID |
| `SUPABASE_URL` | Secret | Same project URL, used server-side |
| `SUPABASE_PUBLISHABLE_KEY` | Secret | Same public key, used server-side |
| `SUPABASE_PROJECT_ID` | Secret | Same project reference ID |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Only needed for admin/service operations |
| `LOVABLE_CRON_SECRET` | Secret | Optional — only if you run Lovable-managed cron/webhook endpoints |

> **Security note:** `VITE_*` variables are embedded in the browser bundle. Never put `SUPABASE_SERVICE_ROLE_KEY` or `LOVABLE_CRON_SECRET` in a `VITE_*` variable.

### 4. Deploy

Click **Deploy**. The build will:

1. Run `scripts/verify-env.ts` to confirm all required variables are present.
2. Switch the Nitro preset to `vercel` automatically (handled by `vite.config.ts` when `VERCEL=1`).
3. Emit the final output to `.vercel/output`.

### Troubleshooting

- **“Invalid supabaseUrl” error on the deployed site:** One or more `VITE_SUPABASE_*` variables are missing or empty in Vercel. Re-check the Environment Variables page, then redeploy.
- **“Missing Supabase environment variable(s)” during build:** The `scripts/verify-env.ts` check caught missing variables. Add them in Vercel and redeploy.
- **Build succeeds but server functions return 500:** Make sure the non-`VITE_` server-side variables (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) are also set in Vercel.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- Lovable Cloud
