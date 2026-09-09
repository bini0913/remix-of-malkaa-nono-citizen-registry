# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deploy to Vercel

This project is configured for Vercel out of the box.

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=<this-repository-url>)

### Manual deploy

1. Push this repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. In **Project Settings → Environment Variables**, add every variable from `.env.example`.
4. Use the default Vercel settings — `vercel.json` already sets the install/build commands.
5. Deploy.

### Environment variables

Copy the values from `.env.example` into Vercel:

| Variable | Type | Purpose |
|----------|------|---------|
| `VITE_SUPABASE_URL` | Public | Lovable Cloud / backend project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public | Anonymous/public API key |
| `VITE_SUPABASE_PROJECT_ID` | Public | Project ID |
| `SUPABASE_URL` | Secret | Server-side project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Secret | Server-side public key |
| `SUPABASE_PROJECT_ID` | Secret | Server-side project ID |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Only needed for admin/service operations |
| `LOVABLE_CRON_SECRET` | Secret | Optional — only for cron/webhook endpoints |

> **Note:** `VITE_*` variables are bundled into the browser. Never put the service role key or cron secret in a `VITE_` variable.

### Build behavior

- `vercel.json` tells Vercel to use `bun install` and `bun run build`.
- `vite.config.ts` detects the `VERCEL=1` environment variable and switches the Nitro preset to `vercel` automatically.
- The output is emitted to `.vercel/output`.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
