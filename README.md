# cub-scouts

A den meeting planner for Cub Scout dens — a password-gated web app for den parents:
browse the rank's Adventures (currently the Tiger rank's 14 adventures),
pick an activity for each requirement, sign up to run a meeting, and generate a printable
meeting plan with a local LLM.

Vanilla TypeScript SPA (Vite, hash routing, no framework) plus a thin Express API.
Sign-ups and plan versions are stored as JSON files on disk — no database.

## Setup

Requires Node 22+.

```bash
npm install
cp config.example.json config.json
```

Edit `config.json`:

| Key | What |
|-----|------|
| `password` | The shared den password parents log in with |
| `frameApiBaseUrl` | Base URL of any OpenAI-compatible chat completions API (`http://localhost:8080/v1` for a local llama.cpp / LM Studio / Ollama endpoint) |
| `frameApiKey` | API key for that endpoint (`sk-local` is fine for local servers) |
| `frameModel` | Model name to request |

Plan generation calls `POST {frameApiBaseUrl}/chat/completions`. Everything else works
without an LLM endpoint.

## Run

```bash
npm run dev        # Vite dev server on port 3001 + API server
npm run build      # compile server + bundle client into dist/
npm start          # run the built server (see AGENTS.md for the nested dist path gotcha)
npm test           # Vitest (12 tests)
npm run typecheck  # both tsconfigs, no emit
```

Docker: `docker compose up --build` (make sure `config.json` exists first — the image
copies it in at build time).

## Repository notes

`AGENTS.md` holds the architecture map and the hard-won gotchas — read it before
changing anything non-trivial.

## License

MIT — see `LICENSE`.
