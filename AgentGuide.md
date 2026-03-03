# Agent Guide

This guide is for AI agents operating `e-cli` against OOB Electron apps.

## Primary objective

Run deterministic, low-token automation loops against a local Electron app by:

1. Establishing a valid session.
2. Discovering stable targets.
3. Executing focused actions.
4. Persisting artifacts.
5. Recovering cleanly from session drift.

## Session contract

- Session file: `.electron-session.json`
- Heavy artifacts: `.state/`
- Exit codes:
  - `0` success
  - `1` generic/runtime
  - `2` invalid args
  - `3` session errors
  - `4` action errors

### Launch behavior

`launch` defaults to Node helper reliability mode.

- Better OOB stability in mixed Bun/Node/Linux environments.
- Uses CDP reconnect flow for all subsequent commands.

If main-process bridge is required and supported in your environment:

```bash
ECLI_DISABLE_NODE_LAUNCH=1 e-cli launch <appPath>
```

## Recommended agent workflow

### 1) Preflight

```bash
e-cli doctor --json
```

If Linux headless: ensure `xvfb-run` exists (`launch` auto-wraps when needed).

### 2) Launch

```bash
e-cli launch <appPath>
```

### 3) Discover target surface

```bash
e-cli get-tree
```

Use deterministic selectors (`id`, stable `data-*`) extracted from app structure.

### 4) Execute minimal command chain

Use one command per intent:

```bash
e-cli click "#open-modal-btn"
e-cli fill "#email-input" "agent@example.com"
e-cli select "#role-select" "admin"
e-cli click "#submit-btn"
```

### 5) Persist validation artifacts

```bash
e-cli screenshot --filename .state/agent-check.png
e-cli snapshot --filename .state/agent-check.txt
e-cli console
e-cli network
```

### 6) Close

```bash
e-cli close
```

## Multi-window guidance

All renderer commands accept optional `[windowIndex]`.

- Default target is index `0`.
- If selector lookup fails but session is alive, retry with explicit window index.
- Re-run `get-tree [windowIndex]` to confirm current target context.

## Recovery playbook

### Session failure (`exit code 3`)

Symptoms:

- `No active session`
- `Electron process died`

Recovery:

1. `e-cli launch <appPath>`
2. `e-cli get-tree`
3. Resume actions

### Action failure (`exit code 4`)

Symptoms:

- `Selector not found`

Recovery:

1. Re-evaluate UI state with `get-tree`.
2. Use more stable selector.
3. Verify correct `windowIndex`.

### Main bridge unavailable

If `eval-main` reports bridge unavailable:

1. Decide if main-process eval is truly required.
2. Relaunch with `ECLI_DISABLE_NODE_LAUNCH=1`.
3. Validate environment stability before continuing.

## OOB onboarding checklist for unknown Electron apps

- Confirm app path is launchable locally.
- Confirm at least one renderer window appears.
- Confirm selectors are deterministic.
- Prefer renderer-safe commands first (`get-tree`, `click`, `fill`, `eval`).
- Use unsafe commands only when needed and explicitly allowed.

## Unsafe command policy

`eval-main` and `run-code` require one of:

- `--allow-unsafe`
- `ECLI_ALLOW_UNSAFE=1`

Agents should avoid unsafe commands unless task requirements explicitly need them.

## Minimal agent script template

```bash
e-cli launch <appPath>
e-cli get-tree
e-cli fill "#username" "agent"
e-cli fill "#password" "secret"
e-cli click "#login"
e-cli screenshot --filename .state/login-result.png
e-cli close
```
