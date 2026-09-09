# ADR 002: Relative bearing in the alert

Status: implemented

## Context

The alert already includes distance in metres. On the boat it is useful to know whether the buddy is ahead or off to the side, without a second display.

## Decision

1. Config boolean **`alertBearing`**, default **false**.
2. When on, append relative bearing: great-circle bearing (geolib, degrees) minus boat heading, normalized to **0–359**. **0 = ahead**, 90 = starboard. Print without leading zeros (`47°`, not `047°`).
3. Heading: **`navigation.headingTrue`**, else **`navigation.headingMagnetic`**. Signal K heading is radians; convert to degrees before subtracting.
4. If both headings are missing, omit the bearing; still send name and distance.
5. Message shape: `Your buddy NAME is near (412m, 47°)`. No extra `rel` / `T` / `M` suffix.

## Consequences

- Magnetic fallback is not the same reference as a true great-circle bearing. Prefer true when it exists.
- COG is not a heading and is not used.
- Do not subscribe extra paths unless needed; read heading with `app.getSelfPath` at alert time (same as position).
