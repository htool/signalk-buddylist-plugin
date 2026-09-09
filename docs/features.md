# Features

Implement in order. One slice per commit unless a slice says otherwise. Stop when the slice's done-when is met.

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

## Later (not this PR)

- Resend alert when distance changes by X metres (`resendAlertDistance`, default 0)
- Tests for distance threshold and notification text
- Align v1 error shapes with v2
