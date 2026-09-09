# Features

Implement in order. One slice per commit unless a slice says otherwise. Stop when the slice's done-when is met.

## 1. Agent docs kit

- **Outcome:** An agent can change this plugin from the files in AGENTS.md without a chat dump.
- **Done when:** AGENTS.md, README scope, architecture, this file, known-gaps, ADR 001, and `skills/buddies/SKILL.md` exist.
- **Out of scope:** `index.js` changes.

## 2. Alert NM, distance text, URN default, name-missing marker

- **Outcome:** Proximity alerts match ADR 001.
- **ADR:** [001](adr/001-alert-units-and-names.md)
- **Done when:**
  - `alertDistance` is NM (`* 1852`), schema says NM
  - alert message includes `(<metres>m)`
  - URN property has default `urn:mrn:imo:mmsi:`
  - missing configured name appends ` (name missing)`; AIS name / urn still used
  - v1 PUT `props.buddiesfind` is `.find` (same commit; one-line bug)
- **Out of scope:** heading in the message, skipping unnamed buddies, version bump, new APIs.

## Later (not this PR)

- Tests for distance threshold and notification text
- Align v1 error shapes with v2
