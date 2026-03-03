# Running Custom Playwright Code

Use `run-code` for advanced renderer-side scenarios not covered by dedicated commands.

## Syntax

```bash
e-cli run-code "
await page.context().grantPermissions(['geolocation']);
const title = await page.title();
return { title, url: page.url() };
"
```

## Common examples

```bash
# Grant permission
e-cli run-code "
await page.context().grantPermissions(['geolocation']);
return 'granted';
"

# Wait for a condition
e-cli run-code "
await page.waitForFunction(() => window.appReady === true);
return 'ready';
"

# Return structured data
e-cli run-code "
return await page.evaluate(() => ({
  title: document.title,
  url: location.href,
}));
"
```

## Guidance

- Keep scripts idempotent when possible to avoid hard-to-debug state drift.
- Return JSON-serializable objects for clearer output.
- Prefer dedicated commands (`click`, `fill`, `route`, `tracing-*`) first, then `run-code`.
- `run-code` receives `page`, `context`, and `browser` as in-scope variables; pass statement bodies, not function wrappers.
