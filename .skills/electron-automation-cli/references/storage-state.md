# Storage State

Manage cookies, localStorage, sessionStorage, and storage state snapshots.

## State save/load

```bash
# Save full storage state
e-cli state-save
e-cli state-save auth-state.json

# Restore state
e-cli state-load auth-state.json
```

## Cookies

```bash
e-cli cookie-list
e-cli cookie-list --domain=example.com
e-cli cookie-get session_id
e-cli cookie-set session_id abc123
e-cli cookie-delete session_id
e-cli cookie-clear
```

## LocalStorage / SessionStorage

```bash
e-cli localstorage-list
e-cli localstorage-get theme
e-cli localstorage-set theme dark
e-cli localstorage-delete theme
e-cli localstorage-clear

e-cli sessionstorage-list
e-cli sessionstorage-get step
e-cli sessionstorage-set step 3
e-cli sessionstorage-delete step
e-cli sessionstorage-clear
```

## Security notes

- Treat saved state files as sensitive if they contain auth data.
- Avoid committing auth state snapshots to source control.
