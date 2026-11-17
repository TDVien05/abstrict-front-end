# ABSTRICT — Frontend

Web app for a platform to find and book hourly home-help services in Ho Chi Minh City, for customers, freelancer/company partners and admins.

- **Live demo:** https://abstrict.vientruong.site
- **API:** https://abstrict.api.vientruong.site (repo: https://github.com/TDVien05/abstrict-back-end)

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | React 19, TypeScript 5.9, Vite 7 |
| UI | Tailwind CSS 4, lucide-react, Nunito Sans font |
| Routing / data | React Router 7, TanStack Query 5 |
| Forms / validation | React Hook Form + Zod 4 |
| QR | `qrcode.react` (display), `jsqr` (check-in scanning) |
| Testing | Vitest + Testing Library (unit), Playwright (e2e) |
| Quality | ESLint 9, `tsc -b` |
| Deployment | Vercel via GitHub Actions |

## Testing on the live demo

1. Open https://abstrict.vientruong.site.
2. Log in with a phone number and password, or register a new account (OTP).
3. Try the flow for each role: customer books and pays the deposit (sandbox) → freelancer confirms, scans the QR, uploads photos → customer accepts, rates or disputes → admin resolves.

### Test accounts

| Role | Phone number | Description |
| --- | --- | --- |
| Admin | `0900000001` | Approves KYC/companies, plans, disputes |
| Customer | `0920000001` | Test customer (District 1) |
| Customer | `0920000002` | Second test customer (outside party, for permission tests) |
| Approved freelancer | `0910000001` – `0910000005` | Have availability and can be booked; `0910000001` = Nguyễn Thị Lan |
| Pending freelancer | `0910000006`, `0910000007` | For the admin to try KYC approval |
| Draft freelancer | `0910000008` | Profile not finished |

> **Password:** `<fill in the current demo password>` — ask the repo owner. Do not commit real passwords.

## Project structure

```text
src/
  app/        # router, layouts, guards (RequireActor), providers, error boundary
  entities/   # shared domain types (auth, booking, company, kyc)
  features/   # business logic: auth, discovery, booking, availability, customer,
              # partner, promotions, payments, ratings, disputes, profiles, catalog, admin, landing
  pages/      # screens: public, customer, partner, admin, payments
  shared/     # api client, ui, lib, styles, assets
e2e/          # Playwright: *.spec.ts (mocked) and *.real.spec.ts (against a real backend)
docs/         # design/API notes
```

More docs: `FRONTEND_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `PROJECT_IDEA.md`.

## Local development

Requirements: Node.js 20+, npm, and a running backend (see the backend repo README).

```sh
npm ci
cp .env.example .env.local     # PowerShell: Copy-Item .env.example .env.local
npm run dev                    # http://localhost:5173
```

Environment variables (`.env.example`):

| Variable | Meaning |
| --- | --- |
| `VITE_API_BASE_URL` | API path used by the browser; keep `/api/v1` |
| `VITE_API_PROXY_TARGET` | Backend the Vite dev proxy forwards to: `http://localhost:8080` (Docker Compose) or `http://localhost:5191` (`dotnet run`); set to `https://abstrict.api.vientruong.site` to use the hosted API |
| `VITE_DEMO_CUSTOMER` / `VITE_DEMO_PARTNER` | Dev only: preview protected routes without logging in |

### Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Typecheck + build into `dist/` |
| `npm run preview` | Preview the build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Type check |
| `npm test` | Unit tests (Vitest) |
| `npx playwright test` | e2e with mocked data |
| `npx playwright test -c playwright.real.config.ts` | e2e against a real backend; accounts via `E2E_*` variables (e.g. `E2E_CUSTOMER_PHONE`, `E2E_CUSTOMER_PASSWORD`, `E2E_FREELANCER_PHONE`, `E2E_ADMIN_PASSWORD`) |

## CI/CD

GitHub Actions runs `lint`, `typecheck`, `test`, and `build` for every pull request and push to `main`. After those checks pass, a pull request from a branch in this repository gets a Vercel Preview deployment; a push to `main` gets a Production deployment. Pull requests from forks run CI only because GitHub does not provide repository secrets to fork workflows. The deploy jobs use `vercel pull`, `vercel build`, and `vercel deploy --prebuilt`. The `vercel.json` setting disables Vercel's automatic Git deployments so each commit is deployed once, after CI.

To connect the workflow to the **existing** Vercel project:

1. Create a [Vercel access token](https://vercel.com/account/tokens) for the account or team that owns the project.
2. Run `vercel link` locally and select the existing project. Read `orgId` and `projectId` from the generated `.vercel/project.json`. Do not commit `.vercel`; it is ignored by Git.
3. Add GitHub repository Actions secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` with the values from the previous steps. The `production` GitHub environment may be configured with reviewers if approval before production is desired.
4. In Vercel, verify that the project's Root Directory is the repository root, Framework Preset is Vite, Build Command is `npm run build`, and Output Directory is `dist`.
5. Keep `VITE_API_BASE_URL` unset or set it to `/api/v1` in Vercel Preview and Production. The `/api/*` rewrite in `vercel.json` forwards these requests to `https://abstrict.api.vientruong.site/api/*`; Vite's `server.proxy` handles the same path only during local development. If Vercel currently has an absolute `VITE_API_BASE_URL`, change it to `/api/v1` and redeploy so browser requests use the rewrite.
6. Open an internal pull request to verify the Preview job, then merge it to verify Production. If branch protection is enabled, require the `Lint, typecheck, test and build` check before merging.

Deployment requires the three GitHub secrets. Until they are configured, CI can run, but the deploy jobs cannot publish to Vercel.
