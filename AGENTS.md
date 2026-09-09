# AGENTS

Read these, then `index.js`. Do not load `signalk-server` source unless a client contract is actually undefined.

| File | Role |
|---|---|
| [README.md](README.md) | Scope: job, Signal K paths, HTTP APIs |
| [docs/architecture.md](docs/architecture.md) | Config → subscribe → `buddy` flag → notification |
| [docs/adr/001-alert-units-and-names.md](docs/adr/001-alert-units-and-names.md) | Locked: NM, metres in text, `(name missing)` |
| [docs/adr/002-alert-bearing.md](docs/adr/002-alert-bearing.md) | Locked: optional relative bearing in the alert |
| [docs/adr/003-resend-on-distance.md](docs/adr/003-resend-on-distance.md) | Locked: resend when distance changes by X m |
| [docs/features.md](docs/features.md) | Ordered slices. Implement the next undone slice only. Feature slices include tests |
| [docs/known-gaps.md](docs/known-gaps.md) | Known bugs and out of scope |
| [skills/buddies/SKILL.md](skills/buddies/SKILL.md) | How to change alerts and the buddy APIs |

## Rules

- One logical change per commit. Do not bump `package.json` version.
- Keep v1 and v2 HTTP APIs working. v2 is the client-facing resources API.
- Plugins write Signal K deltas (`app.handleMessage`). Do not emit NMEA.
- `geolib.getDistance` returns metres. Convert configured range in one place only.
- Put shared alert/resend logic in `lib/alerts.js` and cover it in `test/`. **Every new feature slice includes tests in its done-when.** Run `npm test` before the code commit.
- Slice 5 (unit tests for existing alert/resend behaviour) is implemented.
