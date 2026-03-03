# Electron-Automation-CLI

Token-efficient CLI for automating Electron apps with Playwright.

## Setup

```bash
bun install
```

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
bun test
bun run test:e2e
```

`bun run test:e2e` runs the real Electron fixture integration test (`test/cli.e2e.test.ts`).
To force the full launch/interaction flow, run `ECLI_RUN_E2E=1 ECLI_E2E_FORCE=1 bun test --timeout 90000 test/cli.e2e.test.ts`.
