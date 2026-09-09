# AGENTS

Read these, then `index.js`. Do not load `signalk-server` source unless a client contract is actually undefined.

| File | Role |
|---|---|
| [README.md](README.md) | Scope: job, Signal K paths, HTTP APIs |
| [docs/architecture.md](docs/architecture.md) | Config → subscribe → `buddy` flag → notification |
| [docs/adr/001-alert-units-and-names.md](docs/adr/001-alert-units-and-names.md) | Locked: NM, metres in text, `(name missing)` |
| [docs/features.md](docs/features.md) | Ordered slices. Implement the next undone slice only |
| [docs/known-gaps.md](docs/known-gaps.md) | Known bugs and out of scope |
| [skills/buddies/SKILL.md](skills/buddies/SKILL.md) | How to change alerts and the buddy APIs |

## Rules

- One logical change per commit. Do not bump `package.json` version.
- Keep v1 and v2 HTTP APIs working. v2 is the client-facing resources API.
- Plugins write Signal K deltas (`app.handleMessage`). Do not emit NMEA.
- `geolib.getDistance` returns metres. Convert configured range in one place only.
- After this docs commit, the next commit is features.md slice 2 (alert units and names). No extra features in that commit.
