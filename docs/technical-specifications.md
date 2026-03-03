# Technical Specification

### 1. Tech Stack
*   **Runtime/Package Manager:** Bun (for native TypeScript execution, ultra-fast CLI startup, and efficient module resolution). [browserstack](https://www.browserstack.com/guide/bun-playwright)
*   **Automation Engine:** `playwright` (specifically `require('playwright')._electron`). [stephenhaney](https://stephenhaney.com/2024/playwright-on-fly-io-with-bun/)
*   **CLI Framework (v1 decision):** `commander.js` for structured subcommands and predictable help output.
*   **File System:** Native Bun APIs (`Bun.file()`, `Bun.write()`) for persistent state and logging.

### 2. System Architecture

#### 2.1 State Management (`.electron-session.json`)
Because CLI commands are ephemeral, state must persist between commands.
When `e-cli launch` is executed, the CLI will:
1. Start the Electron app via `_electron.launch()`.
2. Extract the CDP WebSocket Endpoint.
3. Save it to `.electron-session.json` in the current working directory.
```json
{
  "wsEndpoint": "ws://127.0.0.1:45678/devtools/browser/xyz",
  "pid": 12345,
  "appPath": "./dist/main.js"
}
```
*Note: Subsequent commands will use Playwright's `chromium.connectOverCDP(wsEndpoint)` to attach to the running renderer.*

#### 2.2 Core CLI Commands
*   `e-cli launch <appPath>`: Initializes app, writes `.electron-session.json`. (On Linux, automatically wraps the call in `xvfb-run -a` if `DISPLAY` is not set or `--headless` is passed).
*   `e-cli close`: Kills the process ID stored in session state.
*   `e-cli get-tree [windowIndex]`: Extracts the accessibility tree, saves to `.state/tree.txt`, outputs file path only.
*   `e-cli click <selector> [windowIndex]`: Connects via CDP, clicks the element, triggers an automatic screenshot to `.state/last-action.png`.
*   `e-cli fill <selector> <text> [windowIndex]`: Inputs text into targeted element.
*   `e-cli eval-main "<js-code>"`: Attaches to the Electron Main process and runs `electronApp.evaluate()`.

#### 2.3 Expanded Command Families (Parity Track)
The CLI must support broad command families inspired by Playwright-CLI while preserving Electron-first semantics.

*   **Core interactions:** `type`, `dblclick`, `hover`, `drag`, `select`, `upload`, `check`, `uncheck`, `resize`, `eval` (renderer).
*   **Navigation:** `goto`, `go-back`, `go-forward`, `reload`.
*   **Keyboard:** `press`, `keydown`, `keyup`.
*   **Mouse:** `mousemove`, `mousedown`, `mouseup`, `mousewheel`.
*   **Artifacts:** `screenshot`, `pdf`, `snapshot`.
*   **Tabs/windows:** `tab-list`, `tab-new`, `tab-close`, `tab-select`.
*   **State/storage:** `state-save`, `state-load`, cookies/localStorage/sessionStorage command families.
*   **Network/diagnostics:** `route`, `route-list`, `unroute`, `console`, `network`, `run-code`, `tracing-*`, `video-*`.

Electron adaptation notes:

*   Commands default to the first renderer window unless a `windowIndex` is specified.
*   Browser-profile semantics are replaced by project-local Electron session state in `.electron-session.json`.
*   Heavy command outputs must be persisted under `.state/` and returned as paths.

#### 2.4 CLI Output Contract (Normative)
*   Heavy output commands return file paths rather than raw payloads.
*   `e-cli get-tree` prints only the generated text file path on success.
*   `e-cli click` and `e-cli fill` print concise success text plus `.state/last-action.png` path.
*   Errors are single-line, actionable, and should include recovery instructions when possible.

### 3. Implementation Plan (Bun + TS)

#### 3.1 Setup
```bash
bun init
bun add playwright commander
bun add -d @types/bun typescript electron
bunx playwright install-deps # Crucial for Arch Linux Chromium dependencies
```

#### 3.2 Linux/Arch Headless Wrapper Logic
To ensure 100% Linux compatibility without popping up windows on the KDE desktop, the launch command must detect the environment:
```typescript
import { spawn } from 'child_process';

function launchHeadless(appPath: string) {
    const isLinux = process.platform === 'linux';
    const launchArgs = [appPath];
    
    if (isLinux) {
        // Prepend xvfb-run for virtual framebuffer
        console.log('Linux detected: wrapping in xvfb-run');
        return spawn('xvfb-run', ['-a', 'bun', 'run', 'internal-launch.ts', ...launchArgs]);
    }
    // ... normal launch
}
```

#### 3.3 CLI Skills Integration (`SKILL.md`)
To make this discoverable by AI agents, the project includes `.skills/playwright-electron-cli/SKILL.md` plus task-focused references.

Skill package design requirements:

1. Use frontmatter metadata (`name`, `description`) for trigger quality and discoverability.
2. Keep `SKILL.md` focused on:
  - quickstart workflow,
  - command-family matrix,
  - Electron-specific behavior,
  - artifact and recovery contract.
3. Move deep workflow guidance into `.skills/playwright-electron-cli/references/` to reduce prompt bloat.

Current reference modules:

- `references/request-mocking.md`
- `references/running-code.md`
- `references/session-management.md`
- `references/storage-state.md`
- `references/tracing.md`
- `references/video-recording.md`
- `references/main-process.md`

Drift-control rule: whenever command signatures or artifact semantics change, update `docs/cli-contract.md` and affected skill docs in the same change set.

### 4. Edge Cases & Considerations
*   **Electron Bundling:** When using Bun, ensure that `bun build` (if compiling the CLI into a single binary) marks `electron` and `playwright` as external dependencies (`--external playwright`) so it doesn't attempt to bundle browser binaries. [stephenhaney](https://stephenhaney.com/2024/playwright-on-fly-io-with-bun/)
*   **Main Process Disconnects:** If the Electron app crashes, the `wsEndpoint` becomes invalid. Every command must wrap the CDP connection in a `try/catch` and output a clean error to the AI: `"Error: Electron process died. Please run e-cli launch again."`
*   **Context Isolation:** Ensure the AI knows how to handle multiple Electron windows (e.g., if the app spawns a secondary window for settings). The CLI should support targeting `firstWindow()` by default, with flags for window arrays.
*   **Trust Boundary:** `eval-main` executes arbitrary JavaScript in the Electron Main process and must be treated as privileged; this command is intended only for trusted local automation workflows.
