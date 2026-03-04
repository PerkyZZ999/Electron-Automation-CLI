# CLI Contract (Normative)

This document defines the canonical command contract for `e-cli`.

## Global Behavior

- Commands are stateless per process but stateful across invocations via `.electron-session.json`.
- Commands default to renderer window `0` unless a `windowIndex` argument is supplied.
- Heavy outputs are written under `.state/` and returned as file paths.
- Errors are concise, actionable, and use standardized exit codes.

## Skill Alignment

- `.skills/electron-automation-cli/SKILL.md` must mirror this command contract for signatures and workflow ordering.
- Task-focused details must live under `.skills/electron-automation-cli/references/` (request mocking, running code, session management, storage state, tracing, video capture, main process).
- Any command addition/removal/change in this file requires same-change updates to impacted skill docs.

## Exit Codes

- `0` success
- `1` generic command/runtime failure
- `2` invalid arguments/usage
- `3` session-related failures (missing/stale session)
- `4` automation/action failures

## Artifacts

- Session state: `.electron-session.json`
- Accessibility tree: `.state/tree.txt`
- Last action screenshot: `.state/last-action.png`
- Snapshot files: `.state/snapshot-*.txt` or explicit output path
- Telemetry logs: `.state/logs/events.jsonl` and rotated `.state/logs/events-*.jsonl`

## Session Lifecycle Commands

- `e-cli launch <appPath> [--headless]`
- `e-cli close`

## Local Operations Commands

- `e-cli doctor [--json]`
- `e-cli logs [--tail <count>] [--json]`
- `e-cli logs-clear`

## Core Interaction Commands

- `e-cli click <selector> [windowIndex]`
- `e-cli dblclick <selector> [windowIndex]`
- `e-cli fill <selector> <text> [windowIndex]`
- `e-cli type <text> [windowIndex]`
- `e-cli hover <selector> [windowIndex]`
- `e-cli check <selector> [windowIndex]`
- `e-cli uncheck <selector> [windowIndex]`
- `e-cli select <selector> <value> [windowIndex]`
- `e-cli resize <width> <height> [windowIndex]`

## Navigation Commands

- `e-cli goto <url> [windowIndex]`
- `e-cli go-back [windowIndex]`
- `e-cli go-forward [windowIndex]`
- `e-cli reload [windowIndex]`

## Keyboard Commands

- `e-cli press <key> [windowIndex]`
- `e-cli keydown <key> [windowIndex]`
- `e-cli keyup <key> [windowIndex]`

## Mouse Commands

- `e-cli mousemove <x> <y> [windowIndex]`
- `e-cli mousedown [button] [windowIndex]`
- `e-cli mouseup [button] [windowIndex]`
- `e-cli mousewheel <dx> <dy> [windowIndex]`

## Artifact Commands

- `e-cli get-tree [windowIndex]` -> prints only `.state/tree.txt` path
- `e-cli snapshot [windowIndex] [--filename <path>]` -> prints snapshot file path
- `e-cli screenshot [selector] [windowIndex] [--filename <path>]` -> prints screenshot file path
- `e-cli pdf [windowIndex] [--filename <path>]` -> prints PDF file path

## Evaluation Commands

- `e-cli eval <expression> [windowIndex]` (renderer)
- `e-cli eval-main "<jsCode>" [--allow-unsafe]` (main process)

## Tab Commands

- `e-cli tab-list`
- `e-cli tab-new [url]`
- `e-cli tab-close [index]`
- `e-cli tab-select <index>`

## Storage Commands

- `e-cli state-save [filename]`
- `e-cli state-load <filename>`
- `e-cli cookie-list [--domain <domain>] [windowIndex]`
- `e-cli cookie-get <name> [windowIndex]`
- `e-cli cookie-set <name> <value> [windowIndex]`
- `e-cli cookie-delete <name> [windowIndex]`
- `e-cli cookie-clear [windowIndex]`
- `e-cli localstorage-list [windowIndex]`
- `e-cli localstorage-get <key> [windowIndex]`
- `e-cli localstorage-set <key> <value> [windowIndex]`
- `e-cli localstorage-delete <key> [windowIndex]`
- `e-cli localstorage-clear [windowIndex]`
- `e-cli sessionstorage-list [windowIndex]`
- `e-cli sessionstorage-get <key> [windowIndex]`
- `e-cli sessionstorage-set <key> <value> [windowIndex]`
- `e-cli sessionstorage-delete <key> [windowIndex]`
- `e-cli sessionstorage-clear [windowIndex]`

## Network/DevTools Commands (Parity Track)

- `e-cli route <pattern> [opts]`
- `e-cli route-list`
- `e-cli unroute [pattern]`
- `e-cli console [minLevel]`
- `e-cli network`
- `e-cli run-code <code> [windowIndex] [--allow-unsafe]`
- `e-cli tracing-start`
- `e-cli tracing-stop`
- `e-cli video-start`
- `e-cli video-stop [filename]`

### Implementation Notes (Current)

- `route`/`route-list`/`unroute` are persisted in session metadata and re-applied on each command invocation.
- `console` and `network` read accumulated telemetry from `.state/console.jsonl` and `.state/network.jsonl`.
- `video-start` / `video-stop` currently run in frame-capture parity mode:
	- `video-start` enables per-command screenshot frame capture into `.state/video-frames-*`.
	- `video-stop` writes a summary artifact (not an encoded `.mp4` file).

## Unsafe Command Policy

- `eval-main` and `run-code` are blocked unless one of these is provided:
	- `--allow-unsafe`
	- `ECLI_ALLOW_UNSAFE=1`
- When blocked, command exits with code `2` and a remediation hint.

## Standard Error Messages

- `Error: No active session. Run e-cli launch <appPath> first.`
- `Error: Electron process died. Please run e-cli launch again.`
- `Error: Selector not found: <selector>`
- `Error: eval-main is unsafe by design. Re-run with --allow-unsafe or set ECLI_ALLOW_UNSAFE=1.`
- `Error: run-code is unsafe by design. Re-run with --allow-unsafe or set ECLI_ALLOW_UNSAFE=1.`

## Linux/Arch Headless Behavior

- On Linux, if `DISPLAY` is missing or `--headless` is passed, launch runs under `xvfb-run -a`.
- If `xvfb-run` is missing, launch fails with a clear install instruction.
