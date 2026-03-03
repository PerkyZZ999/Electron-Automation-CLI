# Electron-Automation-CLI Implementation Plan

This document outlines the end-to-end development phases for the `Electron-Automation-CLI` project. It serves as a step-by-step roadmap for building the tool from scratch using Bun, Playwright, and Commander.

## Progress Tracker

Last updated: 2026-03-02

- ✅ **Phase 1: Project Initialization & Setup** completed.
- ✅ **Phase 2: Documentation Source-of-Truth Foundation** completed.
- ✅ **Phase 3: Core State Management** completed.
- ✅ **Phase 4: Electron Launcher & Playwright Bridge** completed (renderer CDP bridge + main-process socket bridge bootstrapping + Linux `xvfb-run` wrapper path).
- ✅ **Phase 5: CLI Commands Implementation** completed.
   - ✅ `launch`, `close`, `get-tree`, `click`, `fill` implemented.
   - ✅ `eval-main` implemented via persistent main-process socket bridge.
   - ⏳ Broader E2E validation pending environment dependencies (`xvfb-run`, desktop libs).
- ✅ **Phase 6: AI Agent Skill Integration** completed (`.skills/playwright-electron-cli/SKILL.md` added).
- ✅ **Phase 6B: Skill Quality Refinement & Reference Modules** completed (Playwright-CLI-inspired SKILL structure, frontmatter metadata, and task-specific `references/` docs).
- 🔄 **Phase 7: Command Surface Expansion (Playwright-CLI Parity for Electron)** in progress.
   - ✅ Command matrix and parity scope aligned in source-of-truth docs.
   - ✅ Batch 1 implemented (navigation, keyboard, mouse, artifact, storage, and tab command families).
   - 🔄 Batch 1 runtime hardening in progress (environment-specific launch and broader E2E verification).
   - ✅ Batch 2 implemented (`route`, `route-list`, `unroute`, `console`, `network`, `run-code`, `tracing-start`, `tracing-stop`, `video-start`, `video-stop`).
   - ⏳ Batch 2 deep E2E validation pending full desktop/headless environment dependencies.
- ⏳ **Phase 8: Build, Packaging & Distribution** pending.
   - ✅ Upgraded fixture app to a real multi-file Electron app under `test/fixtures/basic-electron-app/`.
   - ✅ Added real CLI E2E integration test `test/cli.e2e.test.ts` (launch/get-tree/fill/select/check/click/eval/close workflow).
   - ✅ Added dedicated real-app E2E script: `bun run test:e2e`.
   - ✅ Added state-manager tests in `test/state.test.ts`.
- ⏳ **Phase 9: Edge Case Hardening** pending.

## Phase 1: Project Initialization & Setup
**Goal:** Scaffold a robust Bun-powered CLI project environment with the necessary dependencies.

1. **Initialize Project:**
   - Run `bun init` to scaffold the project.
   - Update `package.json` to define the project as a CLI (`bin` configuration).
2. **Install Dependencies:**
   - **Production:** `bun add playwright commander`
   - **Development:** `bun add -d @types/bun typescript @types/node electron`
   - **Playwright Setup:** Execute `bunx playwright install-deps` to ensure all OS-level dependencies (especially for Chromium/Linux) are met.
3. **Repository Structure Setup:**
   - `src/` - Source code for the CLI.
   - `src/commands/` - Individual CLI command modules.
   - `src/utils/` - Shared utilities (state management, formatting).
   - `src/core/` - Electron launch and Playwright interaction logic.
   - `docs/` - Project documentation.
   - `.skills/` - AI Agent skill definitions.

## Phase 2: Documentation Source-of-Truth Foundation
**Goal:** Lock a canonical contract before implementation so all code work references one definitive spec.

1. **Create Documentation Index:** Add `docs/README.md` as the source-of-truth map and document precedence between PRD, technical specs, architecture, and CLI contract.
2. **Define CLI Contract:** Add `docs/cli-contract.md` to specify command signatures, outputs, file artifacts, and error behavior.
3. **Cross-Reference Rules:** Ensure PRD, technical specs, and architecture explicitly reference the CLI contract to avoid drift.

## Phase 3: Core State Management
**Goal:** Implement the stateful bridging mechanism using disk-based JSON storage.

1. **State Interface:** Define a TypeScript interface for the session state (`wsEndpoint`, `pid`, `appPath`).
2. **State Manager (`src/utils/state.ts`):**
   - Write functions to persist the current session to `.electron-session.json`.
   - Write functions to read, validate, and clear the session state.
   - Implement strict error handling if a session is corrupted or the process has unexpectedly died.

## Phase 4: Electron Launcher & Playwright Bridge
**Goal:** Handle the complex dual-process Electron bootstrapping and CDP connection.

1. **Launcher Utility (`src/core/launcher.ts`):**
   - Implement the `_electron.launch()` binding.
   - Implement platform detection (`process.platform === 'linux'`).
   - Create the `xvfb-run -a` wrapper for headless Linux execution to prevent desktop UI interference.
2. **CDP Connection Manager (`src/core/cdp.ts`):**
   - Implement `chromium.connectOverCDP()` logic using the `wsEndpoint` from the saved state.
   - Create helper methods to fetch the primary page/window (`firstWindow()`) and attach to the Main Process.

## Phase 5: CLI Commands Implementation
**Goal:** Wire up the CLI framework and implement the core actions.

1. **CLI Scaffolding (`src/cli.ts`):**
   - Initialize `commander.js`. Set up global error handling and program metadata.
2. **Command: `launch`:**
   - Accepts `<appPath>`.
   - Triggers the launcher utility, extracts the CDP WebSocket URL, and saves the `.electron-session.json`.
3. **Command: `close`:**
   - Reads session state, kills the saved `pid`, and cleans up the session file.
4. **Command: `get-tree`:**
   - Connects to the active renderer.
   - Extracts the accessibility tree.
   - Dumps it to `.state/tree.txt` using Bun's native `Bun.write()`.
   - Outputs only the absolute file path to `stdout`.
5. **Command: `click` & `fill`:**
   - Accepts selectors and inputs.
   - Connects to the renderer, executes the Playwright interaction.
   - Takes a screenshot (`.state/last-action.png`) and outputs the path indicating success.
6. **Command: `eval-main`:**
   - Connects to the active session.
   - Evaluates raw JavaScript in the Main process using `electronApp.evaluate()`.

## Phase 6: AI Agent Skill Integration
**Goal:** Package the tool as a natively recognizable skill for AI coding agents.

1. **Create Skill Definition (`.skills/playwright-electron-cli/SKILL.md`):**
   - Document the `<description>`, `<usage>`, and strict rules for the AI (e.g., "Always start by running `launch`", "Never ask for raw HTML, always use `get-tree`").
   - Define exact command syntax and expected outputs.
2. **Compliance Verification:** Ensure the skill definition adheres to `agentskills.io` standards.

## Phase 6B: Skill Quality Refinement & Reference Modules
**Goal:** Evolve the skill from a flat command list into a scalable, task-oriented package inspired by Playwright-CLI skill design.

1. **Skill Structure Upgrade:**
   - Convert `SKILL.md` to frontmatter + sectional markdown format.
   - Add quickstart workflows and command-family grouping for better discoverability.
2. **Reference Decomposition:**
   - Add `.skills/playwright-electron-cli/references/` and split advanced guidance by workflow (`request-mocking`, `running-code`, `session-management`, `storage-state`, `tracing`, `video-recording`, `main-process`).
3. **Drift Prevention:**
   - Require command-surface and artifact behavior updates in both `docs/cli-contract.md` and skill references during the same change set.

## Phase 7: Command Surface Expansion (Playwright-CLI Parity for Electron)
**Goal:** Expand command coverage to support rich automation workflows comparable to Playwright-CLI, adapted for Electron session semantics.

1. **Batch 1 – High-frequency automation actions:**
   - Add navigation commands (`goto`, `go-back`, `go-forward`, `reload`).
   - Add interaction commands (`dblclick`, `hover`, `check`, `uncheck`, `select`, `type`).
   - Add keyboard and mouse controls (`press`, `keydown`, `keyup`, `mousemove`, `mousedown`, `mouseup`, `mousewheel`).
   - Add artifact commands (`screenshot`, `pdf`, `snapshot`).
   - Add renderer evaluation command (`eval`) in addition to `eval-main`.
2. **Batch 2 – Session and state management enhancements:**
   - Add tab commands (`tab-list`, `tab-new`, `tab-close`, `tab-select`).
   - Add storage commands (`state-save`, `state-load`, cookies, localStorage, sessionStorage command family).
3. **Batch 3 – Advanced diagnostics and traffic control:**
   - Add network route controls (`route`, `route-list`, `unroute`).
   - Add diagnostics and recordings (`console`, `network`, `run-code`, `tracing-start`, `tracing-stop`, `video-start`, `video-stop`).
4. **Parity review loop:**
   - Compare command discoverability and usage ergonomics against Playwright-CLI references and iterate on command ergonomics.

## Phase 8: Build, Packaging & Distribution
**Goal:** Compile the CLI into a fast, single-file executable.

1. **Build Script:**
   - Configure `bun build` in `package.json`.
   - Use `--compile` to bundle the application into a standalone binary.
   - Ensure external dependencies (`--external playwright`, `--external electron`) are properly marked to avoid bundling native browser binaries.
2. **Testing:**
   - Create a real Electron app fixture inside `test/fixtures/` (real BrowserWindow + renderer HTML/JS interactions).
   - Write E2E tests using `bun test` that launch the real fixture app and exercise CLI workflows end-to-end.
3. **Release:** Configure GitHub Actions for continuous integration and automated binary releases.

## Phase 9: Edge Case Hardening
**Goal:** Ensure CLI stability during unexpected events.

- **Stale Sessions:** Detect if the `pid` is running but the app has crashed, outputting explicit instructions (e.g., "Please run e-cli launch again").
- **Multi-Window Apps:** Implement flags or array indices for `get-tree` and action commands to target secondary windows.
- **Timeout Management:** Expose `--timeout` flags for operations that might hang during complex test scenarios.
