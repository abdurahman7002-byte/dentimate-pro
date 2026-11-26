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
  needs ~1.2 GB RAM running and ~7.5 GB of image disk, so the smallest
  machine fits. (docs.github.com/en/codespaces/about-codespaces/what-are-codespaces)
- Personal GitHub accounts include a monthly free quota (observed: 120 core
  hours + 15 GB storage on the Free plan; Pro: 180 + 20 GB). Starting a
  codespace needs no payment details; going beyond the included quota
  requires adding payment details AND a spending limit first - so with no
  payment method on file, usage stops at the quota and cannot charge you.
  (docs.github.com/en/billing/reference/product-usage-included,
  docs.github.com/en/billing/concepts/product-billing/github-codespaces)
- A 2-core machine consumes 2 core-hours per running hour. A short trial
  (an hour or two) is a few core-hours. STOP the codespace when done:
  compute stops then. DELETE it when finished: a stopped codespace still
  counts its disk against the 15 GB included storage until deleted.
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

## Security notes

- Secrets in `.env.dentix` are freshly generated inside your codespace and
  never leave it.
- Signup is disabled; only the owner you create can provision accounts.
- The Supabase Studio dashboard is reachable through the gateway with HTTP
  basic auth; its password is the regenerated `DASHBOARD_PASSWORD` in
  `.env.dentix`, and the private port keeps it off the open internet.
- Deleting the codespace destroys the whole trial environment, fixtures
  included.
