# Taste

## Architecture & Configuration

- Prefers strict, explicit configuration: no defaults and no fallbacks (no env-var rescue, no `||` chains between related settings); a single source of truth with every key required, and startup aborting with a precise list of missing/invalid keys. Confidence: 0.8

## Code Style

- Wants code kept clean — removes redundant fallback branches, duplicated default-value maps, and dead sanitizing paths rather than layering more compatibility code. Confidence: 0.5
