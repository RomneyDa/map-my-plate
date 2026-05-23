# Secrets

Map My Plate uses Soup for shared environment variables and local secret injection.

## One-Time Setup

Install Soup if needed:

```bash
curl -fsSL https://cli.getsoup.dev/install.sh | sh
```

The project scripts can find Soup at `~/.soup/bin/soup` even before your shell path is updated. For direct `soup ...` commands, add Soup to your shell path:

```bash
echo 'export PATH="$PATH:$HOME/.soup/bin"' >> ~/.zshrc
source ~/.zshrc
```

Log in and configure this repository:

```bash
pnpm secrets:login
pnpm secrets:config
```

For a browser/device-code flow:

```bash
pnpm secrets:login:device
```

The default project/environment convention is:

- Project: `map-my-plate`
- Local development environment: `development`
- Future shared environments: `preview`, `production`

If the project or environment does not exist yet, create it in Soup first:

```bash
~/.soup/bin/soup project create map-my-plate
~/.soup/bin/soup env create map-my-plate development
```

## Local Development

Run the app with secrets injected into the process:

```bash
pnpm dev:secrets
```

This avoids writing real credentials to `.env.local`.

## Useful Commands

```bash
pnpm secrets:list
~/.soup/bin/soup secrets set OPENAI_API_KEY
~/.soup/bin/soup secrets set USDA_FDC_API_KEY
~/.soup/bin/soup secrets set GOOGLE_PLACES_API_KEY
~/.soup/bin/soup secrets set MAPTILER_API_KEY
```

## Environment Contract

Keep `.env.example` in sync with expected variables, but never put real values in it.

Use `NEXT_PUBLIC_` variables only for values that are safe to expose to browsers. Server-only keys should not use that prefix.

## Vercel

For Vercel production and preview deploys, either:

- Set environment variables directly in Vercel, or
- Add a Soup-backed deploy step later that injects secrets during build/deploy.

For now, local development should use `pnpm dev:secrets`; Vercel can continue using its built-in environment variable UI.
