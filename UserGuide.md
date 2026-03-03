# User Guide

This guide explains how to use `e-cli` and how to set it up for out-of-box (OOB) Electron apps.

## What `e-cli` does

`e-cli` is a command-line automation bridge for Electron apps.

- Launches your Electron app and stores session state in `.electron-session.json`.
- Reconnects to the running app over CDP for each command.
- Writes heavy outputs to `.state/` and prints file paths (not large payloads).

## How it works

1. `e-cli launch <appPath>` starts the app and writes:
   - `wsEndpoint`
   - `pid`
   - `appPath`
2. Action commands (`click`, `fill`, `get-tree`, etc.) reconnect using the saved `wsEndpoint`.
3. `e-cli close` terminates the active session process.

### Runtime reliability mode (important)

By default, `launch` uses a detached Node helper for better OOB compatibility across environments.

- Default: Node helper enabled.
- Disable only if needed: `ECLI_DISABLE_NODE_LAUNCH=1`.

## Prerequisites

- Bun installed (`bun --version`)
- Node installed (`node --version`) (required by default launch helper)
- Project dependencies installed:

```bash
bun install
bunx playwright install chromium
```

Linux headless support:

```bash
# install with your distro package manager
# package name is often xorg-server-xvfb
xvfb-run --help
```

## Install and run

### Dev mode

```bash
bun run src/cli.ts --help
```

### Local production binary

```bash
bun run build:binary
bun run install:local
e-cli doctor
```

## OOB Electron app setup checklist

Before launching any external/local Electron app:

- App path is valid and local (`<appPath>` exists).
- App creates at least one renderer window.
- App UI has stable selectors (`id` or deterministic `data-*` attributes).
- If running headless on Linux, `xvfb-run` is installed.

## Quickstart with an app

```bash
# 1) Launch app
e-cli launch ./path/to/electron-app

# 2) Inspect accessibility tree path
e-cli get-tree

# 3) Interact
e-cli click "#submit-btn"
e-cli fill "#email-input" "agent@example.com"

# 4) Capture artifact
e-cli screenshot --filename .state/manual-check.png

# 5) Close session
e-cli close
```

## Useful commands

- Session: `launch`, `close`
- Core: `click`, `fill`, `dblclick`, `hover`, `check`, `uncheck`, `select`
- Navigation: `goto`, `go-back`, `go-forward`, `reload`
- Artifacts: `get-tree`, `snapshot`, `screenshot`, `pdf`
- Diagnostics: `doctor`, `logs`, `logs-clear`, `console`, `network`

## Troubleshooting

### `Error: No active session. Run e-cli launch <appPath> first.`

Run `e-cli launch <appPath>` before any action command.

### `Error: Electron process died. Please run e-cli launch again.`

Session PID is stale or app crashed. Relaunch:

```bash
e-cli launch ./path/to/electron-app
```

### `Error: Selector not found: ...`

- Verify selector is correct in current UI state.
- Re-run `e-cli get-tree` and confirm target exists.
- If app has multiple windows/pages, pass a `windowIndex`.

### `Error: Main-process bridge unavailable in session.`

This can happen in default reliability mode. If you need `eval-main`, relaunch with:

```bash
ECLI_DISABLE_NODE_LAUNCH=1 e-cli launch ./path/to/electron-app
```

Use this only when direct launch is stable in your environment.

## Unsafe command policy

`eval-main` and `run-code` are privileged and require explicit opt-in:

```bash
e-cli eval-main "process.platform" --allow-unsafe
# or
ECLI_ALLOW_UNSAFE=1 e-cli run-code "return await page.title()"
```

Only use unsafe commands in trusted local workflows.
