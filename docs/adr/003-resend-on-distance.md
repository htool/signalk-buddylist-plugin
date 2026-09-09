# ADR 003: Resend alert when distance changes by X metres

Status: implemented

## Context

`resendAlerts` re-emits on every position while in range (often too noisy). With it off, the alert fires once until the buddy leaves range, so the metre (and bearing) text goes stale.

## Decision

1. Config number **`resendAlertDistance`**, unit **metres**, default **0** (off).
2. In-memory latch is `{ name, distance }` per buddy urn.
3. While in range, send again if:
   - first time in range, or
   - display name changed, or
   - `resendAlertDistance > 0` and `|distance - last| >= resendAlertDistance`
4. **`resendAlerts` is unchanged.** When true, still send on every position. The two options are independent.
5. Reuse existing notification `method` when already alerting (same as today).

## Consequences

- `0` means “do not resend on movement.” First enter and name change still alert.
- Does not replace `resendAlerts`. If both are set, every position still wins.
