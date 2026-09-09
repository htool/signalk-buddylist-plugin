# Features

Implement in order. One slice per commit unless a slice says otherwise. Stop when the slice's done-when is met. **New feature slices include tests** (`npm test`); put logic in `lib/alerts.js` when it can be tested without a live server.

## 1. Agent docs kit

- **Outcome:** An agent can change this plugin from the files in AGENTS.md without a chat dump.
- **Done when:** AGENTS.md, README scope, architecture, this file, known-gaps, ADR 001, and `skills/buddies/SKILL.md` exist.
- **Out of scope:** `index.js` changes.

## 2. Alert NM, distance text, URN default, name-missing marker

- **Status:** done
- **Outcome:** Proximity alerts match ADR 001.
- **ADR:** [001](adr/001-alert-units-and-names.md)
- **Done when:**
  - `alertDistance` is NM (`* 1852`), schema says NM
  - alert message includes `(<metres>m)`
  - URN property has default `urn:mrn:imo:mmsi:`
  - missing configured name appends ` (name missing)`; AIS name / urn still used
  - v1 PUT `props.buddiesfind` is `.find` (same commit; one-line bug)
- **Out of scope:** heading in the message, skipping unnamed buddies, version bump, new APIs.

## 3. Optional relative bearing in the alert

- **Status:** done
- **Outcome:** Optional bearing vs heading in the notification, per ADR 002.
- **ADR:** [002](adr/002-alert-bearing.md)
- **Done when:**
  - schema `alertBearing` boolean, default false
  - when on: `(412m, 47°)` using headingTrue else headingMagnetic
  - no leading zeros; omit bearing if both headings missing
- **Out of scope:** COG, magnetic/true suffix, resend-on-distance (separate PR), version bump.

## 4. Resend alert when distance changes by X metres

- **Status:** done
- **Outcome:** Optional movement-based resend, per ADR 003.
- **ADR:** [003](adr/003-resend-on-distance.md)
- **Done when:**
  - schema `resendAlertDistance` number, metres, default 0
  - latch is `{ name, distance }`
  - distance resend runs **only if** `resendAlerts` is on
  - with resend on: X = 0 every position; X > 0 only when `|Δdistance| ≥ X`
  - schema order: alert, alertDistance, alertBearing, then resendAlerts, resendAlertDistance
- **Out of scope:** version bump.

## 5. Unit tests for alert and resend

- **Status:** done
- **Done when:** `npm test` covers NM threshold, name-missing text, bearing formatting, first alert, no resend when resend is off, +10 m vs +160 m with resend 100 m, X=0 every position, schema order.
- **Out of scope:** live Signal K / AIS inject.

## 6. Signal K buddies docs

- **Status:** done
- **Outcome:** Next agent can implement opt-in SK buddies from ADR 004 without a chat dump.
- **ADR:** [004](adr/004-signalk-buddies-roster.md)
- **Done when:** ADR 004, this slice, known-gaps (internet-up workaround), skill, AGENTS.md row.
- **Out of scope:** `index.js`, vhfinfo.php.

## 7. Opt-in directory client (lease + POST)

- **Status:** done
- **Outcome:** Checkbox shares MMSI + name with a 90-day lease; DHCP-style renew.
- **ADR:** [004](adr/004-signalk-buddies-roster.md)
- **Done when:**
  - schema `skShare` (default false), `skShareDays` (default 90)
  - POST `{ mmsi, name, share, days }` / `share: false` on uncheck or stop
  - no POST if MMSI or name missing; provider error
  - renew at half lease and on start; backoff on failure
  - internet check is one function in `lib/` (directory HTTP success); tests cover lease math and skip-when-offline
- **Out of scope:** AIS match, SK-group alerts, vhfinfo.php SQL, version bump.

## 8. Match local AIS and SK-group alerts

- **Outcome:** Opted-in MMSIs already in `vessels.*` get the SK-group alert/resend options.
- **ADR:** [004](adr/004-signalk-buddies-roster.md)
- **Done when:**
  - GET roster, intersect with local vessel MMSIs (not self)
  - duplicate alert knobs; same `checkBuddy` / `lib/alerts.js` with a second latch
  - `vessels.<urn>.signalkBuddy`; `notifications.signalkBuddy.<urn>`
  - tests: match, exclude self, expired roster row ignored
- **Out of scope:** fake AIS / NMEA, magic-link, position upload, version bump.

## Later (not this PR)

- Align v1 error shapes with v2
- vhfinfo.org PHP + `sk_buddies` table (companion repo)
- Replace internet seam if signalk-server publishes status
