# electron-app

Fresh Electron app scaffolded with Bun.

## Setup

```bash
bun init
bun install electron --save-dev
bun install
```

## Run

```bash
bun run start
```

## Files

- `main.js` - Electron main process and window lifecycle
- `preload.js` - safe renderer bridge (`window.appApi.ping`)
- `index.html` - mock testing UI with stable selectors
- `renderer.js` - deterministic interaction logic for automation
