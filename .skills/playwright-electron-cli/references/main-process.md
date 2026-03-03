# Main Process Workflows

Use `eval-main` when automation requires Electron Main process APIs.

## Basic usage

```bash
e-cli eval-main "process.platform"
e-cli eval-main "require('electron').app.getName()"
```

## Typical scenarios

- Trigger native dialogs or app-level APIs.
- Inspect Electron `app` metadata.
- Drive privileged flows that are not available in renderer context.

## Safety and constraints

- `eval-main` runs privileged JavaScript; use only in trusted local projects.
- Prefer renderer commands (`click`, `fill`, `eval`) for UI-only tasks.
