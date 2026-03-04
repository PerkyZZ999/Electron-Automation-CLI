# Requirements Traceability Matrix

This matrix maps product requirements from `prd.md` to technical rules and implementation phases.

## Traceability Table

| Requirement ID | PRD Requirement | Technical Realization | Implementation Phase(s) | Verification Approach |
|---|---|---|---|---|
| R1 | Stateful CLI sessions across commands | `.electron-session.json` persistence and read/validate/clear logic | Phase 3 (State Management), Phase 5 (Commands) | Launch once, run multiple commands without relaunch |
| R2 | Token-efficient output to avoid context flooding | Heavy payloads persisted under `.state/`; path-based stdout responses | Phase 5 (Commands), Phase 9 (Hardening) | `get-tree` returns only path; screenshots written to disk |
| R3 | Dual-process execution (Renderer + Main) | Playwright renderer automation + `eval-main` support | Phase 4 (Launcher/CDP), Phase 5 (Commands) | Execute click/fill and main-process eval in one session |
| R4 | Linux/Arch headless support | `xvfb-run -a` behavior when no `DISPLAY` or `--headless` flag set | Phase 4 (Launcher/CDP), Phase 9 (Hardening) | Run on Linux with headless workflow and verify no desktop interference |
| R5 | AI-agent-native usage workflow | `.skills/electron-automation-cli/SKILL.md` and concise command outputs | Phase 6 (AI Skill Integration) | Validate onboarding flow with an AI agent following SKILL instructions |
| R6 | Reliable recovery on stale/crashed sessions | Standardized actionable errors for stale `wsEndpoint`/PID | Phase 9 (Hardening) | Simulate app crash and verify guided relaunch error |
| R7 | Broad command surface for agent-driven E2E automation | Playwright-CLI-inspired command families adapted for Electron renderer/main contexts | Phase 7 (Command Surface Expansion) | Execute representative workflows across navigation, interaction, storage, diagnostics, and artifact commands |
| R8 | High-quality, scalable AI skill package | Frontmatter-based `SKILL.md` + task-specific references under `.skills/electron-automation-cli/references/` with drift-control updates | Phase 6, Phase 6B | Verify skill quickstart/command matrix/reference links and consistency with `cli-contract.md` |
| R9 | Local production readiness without CI dependency | Local distribution scripts (`build:binary`, `install:local`, `smoke:prod`) plus `doctor` preflight checks | Phase 8, Phase 9 | Build binary, run `e-cli doctor --json`, verify non-zero exit on failing checks |
| R10 | Structured observability and safer privileged execution | Evlog telemetry drain to `.state/logs/*.jsonl`; explicit unsafe opt-in for `eval-main`/`run-code` | Phase 9 (Hardening) | Verify logs emitted via `logs`; verify unsafe commands fail without opt-in and pass with opt-in |

## Additional Source-of-Truth Notes

- Canonical command behavior and output semantics are defined in `cli-contract.md`.
- Conflicts are resolved by precedence defined in `docs/README.md`.
- Any requirement changes must update this matrix in the same change set.
