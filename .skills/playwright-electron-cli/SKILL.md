---
name: playwright-electron-cli
description: Automates Electron desktop apps through a token-efficient CLI for UI testing, stateful workflows, diagnostics, and artifact capture. Use whenever the user needs to launch an Electron app, inspect UI state, click/fill/type in renderer windows, run main-process code, capture traces/screenshots, or debug request/console/network behavior.
---

# Electron Automation with e-cli

## Quick start

```bash
# start app session
e-cli launch ./path/to/electron-app

# inspect UI state
e-cli get-tree

# perform interaction and keep progressing with selectors from tree.txt
e-cli click "#submit"
e-cli fill "input[name=email]" "user@example.com"

# inspect diagnostics if needed
e-cli console
e-cli network

# close session
e-cli close
```

## Workflow rules

1. Always start with `e-cli launch <appPath>` unless a confirmed active session already exists.
2. Prefer `e-cli get-tree` and `.state/tree.txt` over raw HTML dumps.
3. Prefer deterministic selectors (stable IDs, role/text patterns, test IDs).
4. Treat `.state/*` outputs as authoritative artifacts for large payloads.
5. Use `e-cli eval-main` only for Electron Main-process workflows and acknowledge unsafe execution explicitly.

## Commands

### Session lifecycle

```bash
e-cli launch <appPath> [--headless]
e-cli close
```

### Core interactions

```bash
e-cli get-tree [windowIndex]
e-cli click <selector> [windowIndex]
e-cli dblclick <selector> [windowIndex]
e-cli fill <selector> <text> [windowIndex]
e-cli type <text> [windowIndex]
e-cli hover <selector> [windowIndex]
e-cli check <selector> [windowIndex]
e-cli uncheck <selector> [windowIndex]
e-cli select <selector> <value> [windowIndex]
e-cli resize <width> <height> [windowIndex]
e-cli eval <expression> [windowIndex]
e-cli eval-main "<jsCode>" [--allow-unsafe]
```

### Navigation

```bash
e-cli goto <url> [windowIndex]
e-cli go-back [windowIndex]
e-cli go-forward [windowIndex]
e-cli reload [windowIndex]
```

### Keyboard and mouse

```bash
e-cli press <key> [windowIndex]
e-cli keydown <key> [windowIndex]
e-cli keyup <key> [windowIndex]
e-cli mousemove <x> <y> [windowIndex]
e-cli mousedown [button] [windowIndex]
e-cli mouseup [button] [windowIndex]
e-cli mousewheel <dx> <dy> [windowIndex]
```

### Artifacts

```bash
e-cli snapshot [windowIndex] [--filename <path>]
e-cli screenshot [selector] [windowIndex] [--filename <path>]
e-cli pdf [windowIndex] [--filename <path>]
```

### Tabs and storage

```bash
e-cli tab-list
e-cli tab-new [url]
e-cli tab-close [index]
e-cli tab-select <index>

e-cli state-save [filename]
e-cli state-load <filename>

e-cli cookie-list [--domain <domain>] [windowIndex]
e-cli cookie-get <name> [windowIndex]
e-cli cookie-set <name> <value> [windowIndex]
e-cli cookie-delete <name> [windowIndex]
e-cli cookie-clear [windowIndex]

e-cli localstorage-list [windowIndex]
e-cli localstorage-get <key> [windowIndex]
e-cli localstorage-set <key> <value> [windowIndex]
e-cli localstorage-delete <key> [windowIndex]
e-cli localstorage-clear [windowIndex]

e-cli sessionstorage-list [windowIndex]
e-cli sessionstorage-get <key> [windowIndex]
e-cli sessionstorage-set <key> <value> [windowIndex]
e-cli sessionstorage-delete <key> [windowIndex]
e-cli sessionstorage-clear [windowIndex]
```

### Network and diagnostics

```bash
e-cli route <pattern> [--action abort|continue]
e-cli route-list
e-cli unroute [pattern]
e-cli console [minLevel]
e-cli network
e-cli run-code <code> [windowIndex] [--allow-unsafe]
e-cli tracing-start [filename]
e-cli tracing-stop [filename]
e-cli video-start [dirname]
e-cli video-stop [filename]

e-cli doctor [--json]
e-cli logs [--tail <count>] [--json]
e-cli logs-clear
```

## Electron-specific behavior

- Session is persisted at `.electron-session.json` in the current working directory.
- Commands default to renderer `windowIndex=0` if not specified.
- `eval-main` runs in Electron Main process; `eval` and `run-code` run in renderer context.
- `eval-main` and `run-code` require `--allow-unsafe` or `ECLI_ALLOW_UNSAFE=1`.
- `video-start`/`video-stop` currently use frame-capture parity mode (summary artifact), not encoded `webm` output.

## Artifacts

- Session file: `.electron-session.json`
- Accessibility tree: `.state/tree.txt`
- Last action screenshot: `.state/last-action.png`
- Console telemetry: `.state/console.jsonl`
- Network telemetry: `.state/network.jsonl`
- Evlog telemetry: `.state/logs/events.jsonl` (rotated `events-*.jsonl`)

## Failures and recovery

- `Error: No active session...` → run `e-cli launch <appPath>`.
- `Error: Electron process died...` → relaunch and retry.
- `Error: Selector not found...` → refresh tree and retry with a valid selector.
- `Error: eval-main is unsafe by design...` → rerun with `--allow-unsafe` (or set `ECLI_ALLOW_UNSAFE=1`).
- `Error: run-code is unsafe by design...` → rerun with `--allow-unsafe` (or set `ECLI_ALLOW_UNSAFE=1`).

## Local invocation fallback

If `e-cli` is not on `PATH`, run through Bun entrypoint:

```bash
bun run src/cli.ts launch ./path/to/electron-app
```

## Specific tasks

- Request mocking: references/request-mocking.md
- Running custom code: references/running-code.md
- Session management: references/session-management.md
- Storage state: references/storage-state.md
- Tracing: references/tracing.md
- Video capture: references/video-recording.md
- Main process workflows: references/main-process.md
