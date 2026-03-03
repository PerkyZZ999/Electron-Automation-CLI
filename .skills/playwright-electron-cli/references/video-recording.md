# Video Capture

Use video commands to capture per-command frames for parity workflows.

## Basic usage

```bash
e-cli video-start
e-cli click "#start"
e-cli fill "input[name=query]" "diagnostic run"
e-cli video-stop
```

## Output behavior

- Current mode is frame-capture parity mode.
- `video-start` enables frame collection into `.state/video-frames-*`.
- `video-stop` writes a text summary artifact with frame metadata.

## Guidance

- Use this for step-wise visual debugging.
- For deep behavioral diagnostics, pair with `tracing-start`/`tracing-stop`.
