# System Architecture & Design

This document describes the structural design and the data flow of the `Electron-Automation-CLI` system. The primary goal of this architecture is to provide a token-efficient interface between AI autonomous agents and local Electron desktop applications.

## High-Level Architecture

The CLI acts as a "Stateful Proxy Pipeline." It bridges ephemeral, stateless terminal commands executed by an AI agent into continuous, stateful Playwright sessions running against a locally instantiated Electron app. 

### Core Components

1. **Terminal / AI Agent Interface:**
   - The CLI surface area parsed by `commander.js`. Returns concise, token-optimized text outputs containing mostly status messages and local file paths rather than massive JSON objects.

2. **State Manager (JSON File Store):**
   - The `.electron-session.json` file. It retains connection details (CDP WS endpoints, UNIX PIDs) across discrete shell executions.

3. **Electron Playwright Bridge:**
   - Connects to the Electron Main and Renderer processes over CDP (Chrome DevTools Protocol) using the `wsEndpoint` fetched from the session state. 

4. **Disk I/O Offloader:**
   - Responsible for intercepting heavy payloads (like full accessibility trees, DOM structures, and binary screenshots) and safely saving them to `.state/` directories while passing only the absolute paths back up to the CLI stdout.

5. **AI Skill Package:**
     - `.skills/playwright-electron-cli/SKILL.md` captures default operational workflow and command families.
     - `.skills/playwright-electron-cli/references/` stores workflow-specific guidance so only relevant material needs to be loaded.

---

## Process Flow Diagrams

### App Launch & Session Creation Flow

```
[ AI Agent ] 
     | 
     | (1) Executes: `e-cli launch ./app`
     v
[ CLI Entrypoint ] ---> [ Platform Detector ]
                             | (If Linux, wrap in xvfb-run)
                             v
[ Playwright Electron Launcher (`_electron.launch`) ]
     |
     | (2) Spawns Main & Renderer Processes
     | (3) Exposes CDP WebSocket Server
     v
[ State Manager ] ---> Writes `.electron-session.json`
     |
     | (4) Returns Success
     v
[ AI Agent ]
```

### Action Execution Flow (e.g., `e-cli click`)

```
[ AI Agent ] 
     | 
     | (1) Executes: `e-cli click "#submit-btn"`
     v
[ CLI Entrypoint ]
     |
     | (2) Read `.electron-session.json`
     v
[ Playwright CDP Connect ] ---> Uses WS to attach to active Chromium Renderer
     |
     | (3) Playwright Locator locates element and dispatches Event
     v
[ Disk I/O Offloader ] ---> Captures Screenshot & saves to `.state/last-action.png`
     |
     | (4) Returns File Path
     v
[ AI Agent ] ---> Agent reads image via its own file-reading mechanisms
```

---

## File System & Repository Structure

```text
Electron-Automation-CLI/
├── src/
│   ├── cli.ts                # Main CLI entrypoint
│   ├── commands/             # Concrete command implementations
│   │   ├── launch.ts
│   │   ├── close.ts
│   │   ├── get-tree.ts
│   │   ├── click.ts
│   │   ├── fill.ts
│   │   └── eval-main.ts
│   ├── core/
│   │   ├── launcher.ts       # Electron launch/bootstrap and platform handling
│   │   └── cdp.ts            # CDP connector and renderer/main process attachment
│   └── utils/
│       ├── state.ts          # Reading/writing .electron-session.json
│       └── logger.ts         # Agent-optimized error formatting and stdout
├── docs/                     # PRD, Tech Specs, Architecture, and Implementation Plans
│   ├── README.md             # Source-of-truth documentation index
│   └── cli-contract.md       # Canonical command and output contract
├── .skills/
│   └── playwright-electron-cli/
│       ├── SKILL.md          # Agent prompt definitions for discovering/using the tool
│       └── references/
│           ├── request-mocking.md
│           ├── running-code.md
│           ├── session-management.md
│           ├── storage-state.md
│           ├── tracing.md
│           ├── video-recording.md
│           └── main-process.md
├── package.json              # Bun configuration and dependencies
└── bun.lock                  # Bun lockfile
```

## Security & Concurrency Considerations

- **Process Orphaning:** To prevent zombie Electron processes, the `e-cli close` command is strictly required to read the PID from the session file and send a SIGTERM. A cleanup trap should also act as a fallback.
- **Port Conflicts:** Ensure that multiple Electron apps can be tracked or that the `launch` command strictly tears down previous sessions before writing over `.electron-session.json`.
- **Read-Only Contexts:** Emphasize to the AI that any `.state/*` file created by the CLI is transient and may be aggressively overwritten by subsequent commands.
- **Command Contract Stability:** Keep `docs/cli-contract.md` as the normative source for command signatures and output behavior to prevent implementation drift.
