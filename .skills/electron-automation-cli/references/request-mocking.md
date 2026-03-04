# Request Mocking

Use route commands to block or allow matching requests during Electron renderer automation.

## Route commands

```bash
# Block matching requests
e-cli route "**/*.jpg" --action abort

# Explicitly allow matching requests
e-cli route "**/api/**" --action continue

# Show active rules
e-cli route-list

# Remove one rule
e-cli unroute "**/*.jpg"

# Remove all rules
e-cli unroute
```

## Pattern examples

```text
**/api/users        Match users endpoint
**/*.png            Match PNG assets
**/v1/**            Match versioned API paths
```

## Notes

- Rules persist in `.electron-session.json` and are re-applied each command invocation.
- Current CLI route action support is `abort|continue`.
- For advanced response shaping/fulfill logic, use `run-code` with `page.route(...)`.
