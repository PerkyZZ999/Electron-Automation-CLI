# Product Requirements Document (PRD)
## `Electron-Automation-CLI` 

### 1. Overview
**Product Name:** Electron-Automation-CLI 
**Target Audience:** AI Coding Agents (Claude Code, Cursor, Windsurf) and developers automating end-to-end (E2E) testing for Electron desktop applications.
**Core Proposition:** A token-efficient command-line interface that enables AI agents to launch, inspect, and manipulate Electron applications via Playwright, saving state and heavy DOM/Accessibility trees to disk rather than flooding LLM context windows, with a modular AI skill package for reliable agent execution workflows.

### 2. Problem Statement
Current AI testing tools (like Playwright MCP) are heavily optimized for web browsers. When AI agents attempt to test Electron apps, they face two major hurdles:
1. Electron's dual-process architecture (Main Node.js process vs. Renderer Chromium process) requires complex bootstrapping that standard browser tools cannot handle.
2. Existing MCP architectures stream massive JSON payloads (DOM trees, screenshots) directly into the model context, exhausting context windows rapidly. [testcollab](https://testcollab.com/blog/playwright-cli)

### 3. Solution
A Bun-powered CLI tool heavily inspired by Microsoft's new `@playwright/cli`. It will act as a stateful bridge between AI bash commands and an active Electron application, writing large outputs (trees, screenshots) to disk and returning concise summaries/paths to the LLM. It will include an AI `SKILL.md` file for native IDE integration. [appsgm](https://appsgm.com/code/playwright-cli)

### 4. Key Features & Requirements
*   **Stateful CLI Sessions:** The AI must be able to launch an app in one command and interact with it in subsequent commands without restarting.
*   **Token-Efficient Output:** Commands that generate heavy payloads (like `get-tree`) must save data to disk and output *only* the resulting file path to stdout. The canonical output files are `.state/tree.txt` and `.state/last-action.png`. [testcollab](https://testcollab.com/blog/playwright-cli)
*   **Dual-Process Execution:** 
    *   *Renderer Actions:* Standard Playwright browser actions (click, type, fill).
    *   *Main Process Actions:* Ability to evaluate raw Node.js code inside the Electron Main process.
*   **Linux/Arch Native:** Must support headless execution on Linux via `xvfb-run` to prevent desktop UI interference during background agent tasks.
*   **AI Skill Quality:** The skill package must provide quickstart instructions, command-family guidance, and task-specific reference modules so AI agents can load focused guidance instead of monolithic prompts.

### 4.1 Scope & Non-Goals (v1)
*   **In Scope:** `launch`, `close`, `get-tree`, `click`, `fill`, and `eval-main` command set with session persistence.
*   **In Scope:** Single active session per working directory using `.electron-session.json`.
*   **Out of Scope (v1):** Cloud orchestration, parallel multi-app sessions in one directory, and browser-web automation features outside Electron.

### 5. User Journey (AI Agent Persona)
1. Agent reads the `SKILL.md` to understand available commands.
2. Agent executes `e-cli launch ./path/to/my-app`.
3. CLI saves session data to `.electron-session.json`.
4. Agent executes `e-cli get-tree` to understand the UI layout.
5. CLI writes `.state/tree.txt` to disk; Agent reads it.
6. Agent executes `e-cli click "#submit-btn"`.
7. CLI performs action, takes an after-action screenshot at `.state/last-action.png`, and replies with success confirmation.

### 6. Success Criteria
*   CLI commands can be run independently while preserving state through `.electron-session.json`.
*   Heavy outputs are persisted to disk and not streamed into stdout payloads.
*   Linux/Arch workflows run headlessly without interfering with the desktop environment.
*   All commands fail with concise, actionable error messages that instruct the agent on recovery (for example, relaunch after a stale session).
