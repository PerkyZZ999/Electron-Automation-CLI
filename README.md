# Electron-Automation-CLI

Token-efficient CLI for automating Electron apps with Playwright.

## Setup

```bash
bun install
```

Ensure Node is available (`node --version`), because default `launch` reliability mode uses a Node helper.

## Guides

- User runbook: `UserGuide.md`
- Agent runbook: `AgentGuide.md`
- Documentation index: `docs/README.md`

For Linux distributions that are not officially supported by Playwright dependency installers (for example Arch), install system libraries with your distro package manager, then install browser binaries:

```bash
bunx playwright install chromium
```

## Run CLI

```bash
bun run src/cli.ts --help
```

## Available scripts

```bash
bun run dev
bun run build
bun run build:binary
bun run install:local
bun run uninstall:local
bun run doctor
bun run logs
bun run logs:clear
bun run smoke:prod
bun test
bun run test:e2e
bun run test:e2e:full
```

`bun run test:e2e` runs the real Electron fixture integration test (`test/cli.e2e.test.ts`).
To force the full launch/interaction flow, run `ECLI_RUN_E2E=1 ECLI_E2E_FORCE=1 bun test --timeout 90000 test/cli.e2e.test.ts`.

## Local production workflow

```bash
# compile standalone binary
bun run build:binary

# install on PATH at ~/.local/bin/e-cli
bun run install:local

# run preflight checks (human-readable)
e-cli doctor

# run preflight checks (JSON)
e-cli doctor --json
```

## Telemetry and logs

- Structured telemetry is emitted through Evlog and written locally to `.state/logs/events.jsonl`.
- Rotated archives are stored as `.state/logs/events-<timestamp>.jsonl`.
- Use `e-cli logs --tail 200` to inspect recent events.
- Use `e-cli logs --tail 100 --json` for parsed output.
- Use `e-cli logs-clear` to clear local telemetry artifacts.

## Unsafe command opt-in

Privileged arbitrary-code commands require explicit opt-in:

```bash
e-cli eval-main "process.platform" --allow-unsafe
e-cli run-code "return await page.title()" 0 --allow-unsafe
```

Or set environment opt-in once per shell:

```bash
export ECLI_ALLOW_UNSAFE=1
```
