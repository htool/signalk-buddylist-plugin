# ADR 001: Alert units and names

Status: implemented

## Context

The htool fork (2021) changed proximity alerts for use on a boat: range in nautical miles, metres in the notification text, and a URN field default in the admin schema. Origin still uses kilometres and `Your buddy <name> is near` with `name || AIS name || urn`.

## Decision

1. **Range unit is NM.** Threshold is `alertDistance * 1852` metres. Schema description says NM. Default stays `1` (now 1 NM, not 1 km). Call this out in the PR; it changes meaning of an existing default.
2. **Notification includes distance in metres.** Example: `Your buddy WAVE DANCER is near (412m)`.
3. **URN schema default** is `urn:mrn:imo:mmsi:` so the admin form starts with a usable prefix.
4. **Still alert if configured `buddy.name` is empty.** Keep AIS name / urn so the target is identifiable. If `buddy.name` is missing, append ` (name missing)` to the message.

Example with no configured name: `Your buddy WAVE DANCER (name missing) is near (412m)`.

## Consequences

- Existing installs with default `alertDistance: 1` become more sensitive (1 NM vs 1 km).
- Clients that parse the notification string may see a new suffix and a metre count.
- Do not skip subscriptions when name is absent (that fork idea was reverted).
