# ADR 003: Resend alert when distance changes by X metres

Status: implemented

## Context

`resendAlerts` re-emits on every position while in range (often too noisy). A movement threshold should refine that resend, not fire on its own.

## Decision

1. Config number **`resendAlertDistance`**, unit **metres**, default **0**.
2. It is a **resend option**: ignored unless **`resendAlerts` is on**.
3. In-memory latch is `{ name, distance }` per buddy urn.
4. First enter and display-name change still alert (those are not resends).
5. While in range **and** `resendAlerts` is on:
   - `resendAlertDistance` is **0**: resend on every position
   - `resendAlertDistance` is **X > 0**: resend only when `|distance - last| >= X`
6. Reuse existing notification `method` when already alerting.
7. Admin schema order: alert options (`alert`, `alertDistance`, `alertBearing`), then resend (`resendAlerts`, `resendAlertDistance`).

## Consequences

- With resend off, moving 100 m does not send again.
- `0` with resend on is the old “continually send” behaviour.
