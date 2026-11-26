# Dentix browser trial (GitHub Codespaces)

A way to try the REAL package - the actual compose stack, the actual app,
actual row-level-security and employee permissions - from a browser, with
synthetic data only, without changing any computer's operating system.

What this is NOT:
- It is NOT the offline/LAN deployment. The stack runs in a GitHub cloud VM.
  It proves nothing about running on clinic hardware, about the LAN, or
  about working without internet. Those remain validated only on the Linux
  CI host, and untested on any specific clinic machine.
- It is NOT for real patient data. Fixtures and synthetic entries only.

## Verified facts about Codespaces (docs.github.com, checked 2026-11-26)

- Machine sizes start at 2 cores / 8 GB RAM / 32 GB storage; this stack
  needs ~1.2 GB RAM running and ~7.5 GB of image disk once pulled, so the
  smallest machine fits on paper. NOTE: actual build/boot disk peak and RAM
  headroom inside a real codespace have NOT been measured - only idle CI
  runner measurements exist. (docs.github.com/en/codespaces/about-codespaces/what-are-codespaces)
- Personal GitHub accounts include a monthly free quota (Free plan:
  120 core-hours compute + 15 GB-month storage; Pro: 180 + 20 GB). The
  included compute is measured in CORE-hours: a 2-core machine consumes
  2 core-hours per running hour (so ~60 running hours per month on Free).
  Storage accrues per GB per hour, so short trials use little - but STOP
  the codespace when done and DELETE it when finished (a stopped codespace
  still counts its disk until deleted). This trial uses the DEFAULT dev
  container image, which is not counted toward included storage; the ~7.5 GB
  of pulled app images DO count as loaded data while the codespace exists.
- Safeguard, exactly as documented: "If your account does not have a valid
  payment method on file, usage is blocked once you use up your quota."
  The even stronger account-level safeguard is a $0 budget for the
  Codespaces product (github.com/settings/billing/budgets): with a $0
  budget, paid usage beyond the included quota is blocked outright.
  Check yours at github.com/settings/billing before the trial.
  (docs.github.com/en/billing/concepts/product-billing/github-codespaces)
- Forwarded ports are PRIVATE by default: only you, signed into your GitHub
  account, can open the app URL. NEVER switch the port to Public - anyone
  with the URL could then open the trial app without any GitHub sign-in.
  (docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)
- Codespaces stop automatically after an idle timeout (30 minutes default).

## Steps

1. In the repository on GitHub: Code -> Codespaces -> create on branch
   `ci-validation` (the smallest machine is enough).
2. In the codespace terminal:

   ```bash
   sh local-edition/packaging/trial/start-trial.sh
   ```

   First boot pulls ~2.2 GB of images (a few minutes on the codespace
   network). The script asks you to choose the trial owner's email+password.
3. Open the printed URL (`https://<codespace>-8080.app.github.dev`), sign in
   with GitHub if asked (private port), then log into the app as the owner.
   Create synthetic patients/employees, toggle permissions, watch
   notifications arrive live, try the same-clinic denial with a second user.
4. Done: stop the codespace (github.com/codespaces). Finished for good:
   delete it there to free the storage quota.

## What is verified about this route

- The trial profile (plain-HTTP listener inside the VM, single origin for
  app + API, realtime through the same port) is validated in CI
  (`.github/workflows/trial-validation.yml`): boot, owner bootstrap, login,
  employee provision, RLS/storage negatives, realtime subscribe.
- NOT yet exercised end-to-end: the app.github.dev forwarding edge itself
  (TLS termination, websocket pass-through through the edge). That part runs
  on GitHub's infrastructure and is exercised on first real use; if the app
  loads but live notifications do not arrive through the edge, that is an
  edge-specific issue, not a product regression - report it.
- NOT yet measured inside a real codespace: actual disk peak during image
  build/pull and boot, and RAM headroom under load. The fit claim above
  comes from machine specs vs idle CI-runner measurements only.
- Rerun safety: start-trial.sh is idempotent on a normal rerun (secrets are
  kept, bootstrap is skipped if an owner already exists), and it REFUSES to
  generate fresh secrets if an initialized database exists without its
  .env.dentix (that would silently orphan the existing installation).

## Security notes

- Secrets in `.env.dentix` are freshly generated inside your codespace and
  never leave it.
- Signup is disabled; only the owner you create can provision accounts.
- The owner can change their own email/password inside the app (employees
  page, account card, current password required). A password change revokes
  all sessions immediately (refresh layer); a forgotten owner password is
  recovered from the codespace shell with
  `docker compose ... exec -T provision node reset-owner.mjs` (loopback-only
  endpoint - shell access is the authority, same trust as the DB volume).
- The Supabase Studio dashboard is reachable through the gateway with HTTP
  basic auth; its password is the regenerated `DASHBOARD_PASSWORD` in
  `.env.dentix`, and the private port keeps it off the open internet.
- Deleting the codespace destroys the whole trial environment, fixtures
  included.
