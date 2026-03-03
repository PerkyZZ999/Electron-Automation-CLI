# e-cli Commands

Comprehensive command reference for `e-cli`.

## Usage

```bash
e-cli [options] [command]
```

## Global options

- `-V, --version` — output the version number
- `-h, --help` — display help for command

## Session lifecycle

| Command | Description |
|---|---|
| `launch [options] <appPath>` | Launch an Electron app and persist the CLI session |
| `close` | Close the active Electron automation session |
| `get-tree [windowIndex]` | Export the accessibility tree for a renderer window |
| `eval-main [options] <jsCode>` | Evaluate JavaScript in the Electron main process |

## Navigation and page actions

| Command | Description |
|---|---|
| `goto <url> [windowIndex]` | Navigate active renderer page to a URL |
| `go-back [windowIndex]` | Navigate back in renderer history |
| `go-forward [windowIndex]` | Navigate forward in renderer history |
| `reload [windowIndex]` | Reload current renderer page |
| `resize <width> <height> [windowIndex]` | Resize renderer viewport |
| `screenshot [options] [selectorOrWindowIndex] [windowIndex]` | Capture screenshot of page or selected element |
| `pdf [options] [windowIndex]` | Save current renderer page as PDF |
| `snapshot [options] [windowIndex]` | Capture renderer snapshot and accessibility tree |
| `eval <expression> [windowIndex]` | Evaluate JavaScript in renderer context |

## Element and input actions

| Command | Description |
|---|---|
| `click <selector> [windowIndex]` | Click a renderer element by selector |
| `dblclick <selector> [windowIndex]` | Double-click an element |
| `hover <selector> [windowIndex]` | Hover over an element |
| `fill <selector> <text> [windowIndex]` | Fill text into a renderer element by selector |
| `type <text> [windowIndex]` | Type text through active keyboard focus |
| `check <selector> [windowIndex]` | Check checkbox/radio by selector |
| `uncheck <selector> [windowIndex]` | Uncheck checkbox by selector |
| `select <selector> <value> [windowIndex]` | Select option value on a `<select>` element |
| `press <key> [windowIndex]` | Press a keyboard key |
| `keydown <key> [windowIndex]` | Send keyboard keydown |
| `keyup <key> [windowIndex]` | Send keyboard keyup |
| `mousemove <x> <y> [windowIndex]` | Move mouse to viewport coordinates |
| `mousedown [button] [windowIndex]` | Send mouse down |
| `mouseup [button] [windowIndex]` | Send mouse up |
| `mousewheel <dx> <dy> [windowIndex]` | Scroll mouse wheel |

## Tabs and context state

| Command | Description |
|---|---|
| `tab-list` | List current renderer tabs/windows |
| `tab-new [url]` | Open a new tab in current renderer context |
| `tab-close [index]` | Close a tab by index (default 0) |
| `tab-select <index>` | Bring tab to front by index |
| `state-save [filename]` | Save storage state for current renderer context |
| `state-load <filename>` | Load storage state into current renderer context |

## Cookies and storage

| Command | Description |
|---|---|
| `cookie-list [options] [windowIndex]` | List cookies |
| `cookie-get <name> [windowIndex]` | Get a cookie by name |
| `cookie-set <name> <value> [windowIndex]` | Set a cookie on current page URL |
| `cookie-delete <name> [windowIndex]` | Delete cookies by name |
| `cookie-clear [windowIndex]` | Clear all cookies |
| `localstorage-list [windowIndex]` | List localStorage entries |
| `localstorage-get <key> [windowIndex]` | Get localStorage value |
| `localstorage-set <key> <value> [windowIndex]` | Set localStorage value |
| `localstorage-delete <key> [windowIndex]` | Delete localStorage key |
| `localstorage-clear [windowIndex]` | Clear localStorage |
| `sessionstorage-list [windowIndex]` | List sessionStorage entries |
| `sessionstorage-get <key> [windowIndex]` | Get sessionStorage value |
| `sessionstorage-set <key> <value> [windowIndex]` | Set sessionStorage value |
| `sessionstorage-delete <key> [windowIndex]` | Delete sessionStorage key |
| `sessionstorage-clear [windowIndex]` | Clear sessionStorage |

## Network, tracing, and diagnostics

| Command | Description |
|---|---|
| `route [options] <pattern>` | Persist a network route rule for subsequent commands |
| `route-list` | List persisted route rules |
| `unroute [pattern]` | Remove a route pattern or clear all routes |
| `console [minLevel]` | List captured console entries |
| `network` | List captured network events |
| `run-code [options] <code> [windowIndex]` | Run Playwright snippet with page/context/browser objects |
| `tracing-start [filename]` | Start Playwright tracing for current context |
| `tracing-stop [filename]` | Stop tracing and write trace artifact |
| `video-start [dirname]` | Start frame-based video capture (artifact parity mode) |
| `video-stop [filename]` | Stop frame capture and write summary artifact |
| `doctor [options]` | Run local production preflight checks |

## Logs and help

| Command | Description |
|---|---|
| `logs [options]` | Show local evlog artifacts from .state/logs |
| `logs-clear` | Clear local evlog artifact files from .state/logs |
| `help [command]` | Display help for command |

## Tip

For command-specific options and examples:

```bash
e-cli <command> --help
```
