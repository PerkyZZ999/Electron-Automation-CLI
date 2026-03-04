# Session Management

`e-cli` uses one active Electron session per working directory.

## Session lifecycle

```bash
# Start session
e-cli launch ./path/to/electron-app

# Use commands across multiple invocations
e-cli get-tree
e-cli click "#save"

# End session
e-cli close
```

## Session file

- Session metadata is stored in `.electron-session.json`.
- Commands fail with actionable guidance when session is missing or stale.

## Recovery patterns

```bash
# Typical recovery after crash/stale pid
e-cli launch ./path/to/electron-app
```

- If you see `Error: No active session...`, launch again.
- If you see `Error: Electron process died...`, relaunch and retry.

## Best practices

- Keep each automation run scoped to one workspace directory.
- Always call `e-cli close` when done.
- Do not manually edit `.electron-session.json`.
