# Tracing

Use trace recording for debugging action flows and renderer behavior.

## Basic usage

```bash
e-cli tracing-start
e-cli click "#checkout"
e-cli fill "input[name=email]" "user@example.com"
e-cli tracing-stop
```

## File handling

```bash
e-cli tracing-start .state/trace-login.zip
e-cli tracing-stop .state/trace-login.zip
```

## Guidance

- Start tracing before the problematic step to capture full context.
- Keep trace filenames descriptive per workflow.
- Tracing may add execution overhead; disable when not debugging.
