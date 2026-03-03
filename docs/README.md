# Documentation Source of Truth

This folder is the canonical source of truth for `Electron-Automation-CLI`.

## Document Map

1. **Product Requirements**
   - `prd.md`
   - Defines the product intent, user persona, and business-level requirements.

2. **Technical Blueprint**
   - `technical-specifications.md`
   - Defines architecture constraints, technology decisions, and engineering requirements.

3. **System Architecture**
   - `project-architecture.md`
   - Defines runtime component boundaries, process flows, and repository structure.

4. **Execution Roadmap**
   - `implementation-plan.md`
   - Defines phased delivery for implementation, testing, and release.

5. **CLI Contract (Normative for command behavior)**
   - `cli-contract.md`
   - Defines command signatures, outputs, artifacts, and error/exit-code semantics.

6. **Requirements Traceability**
   - `requirements-traceability.md`
   - Maps PRD requirements to technical realization, implementation phases, and verification.

7. **AI Skill Package (Operational Contract for Agents)**
   - `../.skills/playwright-electron-cli/SKILL.md`
   - `../.skills/playwright-electron-cli/references/*.md`
   - Defines AI-facing operational workflows, command-family usage, and task-specific guidance.

8. **Operational Guides**
   - `../UserGuide.md`
   - `../AgentGuide.md`
   - Practical setup/runbooks for humans and autonomous agents, including OOB Electron app onboarding.

## Precedence Rules

When there is a conflict between documentation files, resolve using this order:

1. `cli-contract.md` (command surface/output behavior)
2. `technical-specifications.md` (engineering constraints and implementation rules)
3. `project-architecture.md` (structural mapping)
4. `prd.md` (product intent and outcomes)
5. `implementation-plan.md` (delivery sequencing)

`requirements-traceability.md` is a derived mapping document and must mirror the authoritative sources above; it does not override them.

AI skill files are derived operational guidance and must mirror command/behavior decisions from `cli-contract.md` and `technical-specifications.md`.

## Canonical Project Conventions

- Runtime and package management use Bun (`bun`, `bunx`).
- Session persistence file: `.electron-session.json`.
- Heavy-output artifact directory: `.state/`.
- Canonical heavy-output files:
  - Accessibility tree: `.state/tree.txt`
  - Last action screenshot: `.state/last-action.png`
- Command coverage target:
   - Session lifecycle: `launch`, `close`
   - Core interactions: `click`, `fill`, `type`, `dblclick`, `hover`, `check`, `uncheck`, `select`, `resize`
   - Navigation: `goto`, `go-back`, `go-forward`, `reload`
   - Keyboard/mouse: `press`, `keydown`, `keyup`, `mousemove`, `mousedown`, `mouseup`, `mousewheel`
   - Artifacts: `get-tree`, `snapshot`, `screenshot`, `pdf`
   - Evaluation: `eval`, `eval-main`
   - Tabs/state/storage/network/devtools command families (parity track)

## Governance

- Any change to command syntax or output behavior must update `cli-contract.md` first.
- Any change to architecture assumptions must update `project-architecture.md` and `technical-specifications.md` in the same change set.
- Any new feature request should be reflected in `prd.md` before implementation begins.
- Any command contract change must also update `.skills/playwright-electron-cli/SKILL.md` and any impacted reference file under `.skills/playwright-electron-cli/references/` in the same change set.
