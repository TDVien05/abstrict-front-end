# Abstrict frontend

## Local development

```sh
npm ci
cp .env.example .env.local
npm run dev
```

## CI/CD

GitHub Actions runs `lint`, `typecheck`, `test`, and `build` for every pull request and push to `main`. After those checks pass, a pull request from a branch in this repository gets a Vercel Preview deployment; a push to `main` gets a Production deployment. Pull requests from forks run CI only because GitHub does not provide repository secrets to fork workflows. The deploy jobs use `vercel pull`, `vercel build`, and `vercel deploy --prebuilt`. The `vercel.json` setting disables Vercel's automatic Git deployments so each commit is deployed once, after CI.

To connect the workflow to the **existing** Vercel project:

1. Create a [Vercel access token](https://vercel.com/account/tokens) for the account or team that owns the project.
2. Run `vercel link` locally and select the existing project. Read `orgId` and `projectId` from the generated `.vercel/project.json`. Do not commit `.vercel`; it is ignored by Git.
3. Add GitHub repository Actions secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` with the values from the previous steps. The `production` GitHub environment may be configured with reviewers if approval before production is desired.
4. In Vercel, verify that the project's Root Directory is the repository root, Framework Preset is Vite, Build Command is `npm run build`, and Output Directory is `dist`.
5. Configure `VITE_API_BASE_URL` in the Vercel Preview and Production environments to the deployed API URL. The `/api/v1` value in `.env.example` relies on Vite's local development proxy and will not reach a separate backend from Vercel.
6. Open an internal pull request to verify the Preview job, then merge it to verify Production. If branch protection is enabled, require the `Lint, typecheck, test and build` check before merging.

Deployment requires the three GitHub secrets. Until they are configured, CI can run, but the deploy jobs cannot publish to Vercel.
