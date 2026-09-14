# cub-scouts — Cub Scouts Den Meeting Planner

Password-gated web app for Cub Scout den parents: browse Adventures, pick activities per
requirement, sign up to run meetings, and generate a printable LLM meeting plan.

## Architecture

Hybrid: static vanilla-JS SPA (Vite) + thin Express API. No frontend framework, no client
router — hash routing (`#/`, `#/adventure/<id>`) in `src/client/app.ts`.

| Layer | Location | Notes |
|-------|----------|-------|
| SPA | `src/client/` | `index.ts` entry, `pages/` (login, dashboard, adventure), `components/activity-picker.ts` |
| API | `src/server/` | Express: config, signups, plan routes |
| Shared types | `src/shared/types.ts` | Used by both sides |
| Static content | `content/adventures.json` | **Bundled client-side** via JSON import — there is NO `/api/adventures` route (design API table has only config/signups/plan). 6 required + 8 elective Tiger adventures, requirements simplified (not verbatim BSA) |
| Live data | `signups.json` | File-based store at project root (tracked as an empty seed; live data accumulates at runtime) |
| Config | `config.json` | Password + LLM API endpoint/key/model — untracked; copy `config.example.json` to create it (see below) |
| Styles | `public/styles.css` | Single stylesheet, CSS variables |

## Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | `tsc --project tsconfig.server.json` then `vite build --config vite.client.config.ts`. Output: `dist/server/` + `dist/client/index.html` with hashed assets |
| `npm test` | Vitest, 12 tests (plan test hits the configured LLM API if reachable, ~20–40s; passes either way) |
| `npm run typecheck` | Both tsconfigs with `--noEmit` |
| `npm run dev` | Vite on 3001 + tsx server (for development only) |
| `npm start` | `node dist/server/index.js` — note the Dockerfile CMD is `dist/server/server/index.js` (nested) |

## Local test server (how QA is done here)

The app is tested locally via a plain Node server, not Docker (pick any free port):

```bash
npm run build
setsid --fork sh -c "exec env PORT=8123 node $(pwd)/dist/server/server/index.js > /tmp/cub-scouts.log 2>&1" < /dev/null
```

**Gotcha:** launch the server with `setsid --fork` and absolute paths, exactly as above.
If you background it with `&` in a normal shell command, the shell waits on the inherited
file descriptors and the process gets killed when the command times out. Health check:
`curl localhost:8123/health`.

Do a browser QA pass: password gate (wrong password → rejected, the password from your
`config.json` → in), dashboard, adventure detail, sign-up, plan generation, print, at both
desktop (1280px) and mobile (400px) widths.

## Config and auth

- `config.json` holds the shared den password and the connection to an OpenAI-compatible
  LLM API (`llmBaseUrl`, `llmApiKey`, `llmModel`). It is **not tracked in git** —
  copy `config.example.json` to `config.json` and fill in real values. Fallback defaults
  live in `src/server/config.ts`.
- Auth is a shared password, not accounts. The login page sends the entered password to
  `/api/config` in the `X-Password` header; wrong password → 401, correct → 200. The
  password itself is stored client-side in `localStorage.tigerden-auth` and sent as
  `X-Password` on every API call. **Never hardcode the password in client code.**
- `/api/signups` and `/api/plan` are protected by `requireAuth` (401 without a valid password).

## Gotchas

- **LLM timeouts are long on purpose.** A full plan generation takes ~36 seconds against
  a local LLM API. `src/server/llm.ts` has a **60-second** timeout — do not lower it. The
  plan route test in `src/server/routes.test.ts` needs its own **90-second** timeout, or it
  flakes. A 10-second timeout previously made plan generation always fail with
  "This operation was aborted" (and the test silently raced the abort).
- **`findProjectRoot()` in `src/server/config.ts` and `src/server/routes.ts`** walks up
  from the module dir to the first `package.json`. This is what makes path resolution work
  both in Vitest (from `src/`) and production (from `dist/server/server/`). Don't replace
  it with fixed `../../..` path math — it breaks one of the two environments.
- **Vite root is `public/`** (`vite.client.config.ts`). This flattens output to
  `dist/client/index.html` instead of `dist/client/public/index.html`. `publicDir: false`
  and `@` → `src` alias are required. `public/index.html` references the entry as
  `@/client/index.ts`.
- **Content is verbatim from scouting.org (as of 2026-09-12).** `content/adventures.json`
  holds all 23 Tiger adventures — 6 required + 17 electives — with requirement text and
  per-requirement activity options taken **verbatim** from the official
  `/cub-scout-adventures/<slug>/` pages (each requirement page lists "Choose one of the
  following:" with named activities + one-line descriptions; that is the source of truth).
  An earlier version had invented/simplified requirements and wrong categories (Tiger's
  Roar was mislabeled "Communication", Tiger Circles "Science and Technology", Team Tiger
  "Family and Friends", Tigers in the Wild "The World Around Us"); the correct categories
  are Personal Safety / Family & Reverence / Citizenship / Outdoors. The required-adventure
  slugs differ from the id (`bobcat-tiger`, `tigers-roar`, `tiger-circles`, `tiger-bites`,
  `team-tiger`, `tigers-in-the-wild`). Elective pages carry NO topic category label (only
  "Elective") — the `category` on electives is a thematic label chosen for the dashboard
  pill, not official text. Re-fetch from the official pages before changing any requirement.
- **Category labels and combo options are styled in CSS.** `.card-category` (dashboard
  cards) and `.detail-category` (detail page) render as pill badges — `public/styles.css`.
  `.activity-picker`/`.activity-option` stack radio options vertically one per line with a
  bordered row each. Don't remove these rules; they were added for the grouping/badge fixes.
- **`signups.json` and `plans.json` accumulate test data — and the test suite writes to
  them directly (test-isolation bug).** QA sign-ups ("Test Parent") and generated plans
  pollute the committed files; worse, `npm test` itself repopulates them because the route
  and plan tests write to the real project-root files (no temp-file isolation). Reset
  `signups.json` to `{"signups": []}` and `plans.json` to `{"plans": []}` **after** the last
  `npm test`/browser run, right before committing. (Real fix, not yet done: point the tests
  at a temp dir.)
- **Sign-up flow hardening (`src/client/pages/adventure.ts`, `api.ts`).** A 401 on any
  authenticated call (sign-up, plan generation) clears `localStorage.tigerden-auth` and
  reloads so the login gate takes over — it must NOT surface a raw "Error: Unauthorized"
  (that dead-end was the reported "error when I tried to sign up"; the happy path always
  worked). The sign-up submit also trims the name, blocks empty and case-insensitive
  duplicate names client-side (against the current list), and disables the button while
  posting. `currentSignupNames` module state backs the duplicate check.
- **Adventure detail is now a 3-step guided wizard** (Activities → Review & Sign Up → Plan),
  not a single page. `src/client/pages/adventure.ts` holds the wizard: `wizardStep` module
  state, `chosen` map (requirement number → activity name or "Custom: ..."), stepper header
  re-rendered on every step change, and plan versions behind a dropdown (`#version-select`,
  newest first) loaded from `GET /api/plans`. Plan versions persist to `plans.json` with a
  `crypto.randomUUID()` id, newest first.
- **Wizard back-nav restores selections from `chosen`, not the DOM.** The radios are
  re-rendered fresh each time step 1 is shown, so `restoreStep1Selections()` re-checks them
  by matching activity name. The Next handler rebuilds `chosen` from the DOM, so if step 1
  ever rendered without restore, re-advancing would wipe all choices.
- Commit messages follow conventional-commit style (`feat:`/`fix:`/`chore:`).

## Deployment

- Dockerfile: multi-stage; the runtime stage copies `node_modules`, `dist`, `content`,
  `signups.json`, and `config.json` (so `config.json` must exist in the build context —
  copy `config.example.json` and fill it in before building); CMD is
  `node dist/server/server/index.js` (nested path).
- docker-compose.yml: bind-mounts `./signups.json:/app/signups.json` (a named volume
  can't mount a single file) and maps a host port to container port 3000. The app is
  deployed behind a reverse proxy; wire it into your own infrastructure (proxy, TLS,
  DNS) however you host containers.
- **The bind-mounted `signups.json` must be owned by UID/GID 1000 on the host**, matching
  the container's non-root user (`Dockerfile` runs as `node:22-alpine`'s built-in `node`
  user, UID/GID 1000 baked into the base image — stable across rebuilds, unlike creating
  a fresh Alpine system user, whose UID isn't guaranteed and collided with the base
  image's existing GID 1000 in a first attempt at this fix).
  A bind mount replaces the file's ownership/permissions with whatever the host copy has —
  the image's build-time `chown -R node:node /app` has no effect on it once mounted. If
  `signups.json` was created on the host by a different process/user (root, an rsync
  as a different account, etc.), sign-up writes fail with `EACCES: permission denied,
  open '/app/signups.json'` even though reads work fine. Fix: `chown 1000:1000
  signups.json` on the host (or `chmod 666 signups.json` if you don't want to bother
  matching the UID).

### How it is actually deployed in this homelab (serve host)

- The live instance runs on the **serve** host (tailnet, reachable as `ssh serve`) as the
  Docker container **`ixiri-cub-scouts`**, port `8122:3000` — proxied at `scouts.home`
  and public at `cubs.murmur8.cloud` via the Cloudflare tunnel (`serve-cloudflared`).
  It is NOT NixOS-managed and has no CI runner — a standalone Docker Compose stack, like
  serve-home-assistant / serve-n8n.
- **The deployed copy is a plain file copy, not a git checkout**, at
  `~/Documents/GitHub/tiger-den` on serve (old pre-rebrand folder name; its
  `docker-compose.yml` uses `container_name: ixiri-cub-scouts`, differing from this repo's
  `cub-scouts`). Its `config.json` (real den password + LLM endpoint) lives there and is
  NOT in git — never overwrite it.
- **Deploy procedure** (from this repo on a dev box; there is no `git pull` on serve):
  1. Commit + push here.
  2. `rsync -avz --delete` the source to `serve:~/Documents/GitHub/tiger-den/`, **excluding**
     `.git node_modules dist config.json docker-compose.yml signups.json plans.json` so
     serve keeps its own secret/config/compose and live data.
  3. `ssh serve 'cd ~/Documents/GitHub/tiger-den && docker compose up -d --build'` — the
     multi-stage Dockerfile compiles TS and bundles `content/` inside the build.
  4. Verify live from ground truth: `curl localhost:8122/health` on serve, and confirm the
     served bundle hash matches the local `npm run build` output (grep the bundle for a
     new string, e.g. a new elective name).
