---
name: buddies
description: >-
  Change Signal K buddy-list alerts and HTTP APIs in this plugin.
  Use when editing signalk-buddylist-plugin, notifications.buddy,
  alertDistance, buddy.name, SK buddies share, or /signalk/v1|v2/api/resources/buddies.
---

# Buddy list

Read [AGENTS.md](../../AGENTS.md) first. Next slice is [docs/features.md](../../docs/features.md).

## Do

- Convert `alertDistance` to metres in **one** place. After slice 2 that factor is **1852** (NM). Do not mix km and NM.
- `geolib.getDistance` is already metres. Put metres in the alert as `(${distance}m)`.
- Display name: `buddy.name || AIS name || urn`. If `buddy.name` is missing, append ` (name missing)` to the message. Still subscribe and still alert.
- Keep v1 and v2 routes. Fix v1 with `.find`, do not copy v2 JSON onto v1.
- Recode onto current `index.js`. Do not cherry-pick `fork-work-2021` (`checkBuddy` gained `resendAlerts`).
- Put new alert/resend behaviour in `lib/alerts.js` and add tests in `test/` in the same feature. `npm test` must pass.
- `resendAlertDistance` is ignored unless `resendAlerts` is on. With resend on, 0 = every position; X > 0 = only after X metres.
- SK buddies: checkbox POST to vhfinfo; lease `skShareDays` default 90; renew at half lease. Internet = directory HTTP via one `lib/` function. Match local AIS only. Separate `signalkBuddy` flag and `notifications.signalkBuddy`.

## Do not

- Skip buddies that have no configured name.
- Pad relative bearing with leading zeros.
- Use COG as heading.
- Bump the npm version.
- Emit NMEA or touch signalk-server internals.
- Expand a feature PR without tests for that slice.
- Reuse `buddy` / `notifications.buddy` for the SK group.
- Encode fake AIS onto N2K.
- Use magic-link or LTE plugin paths for opt-in / internet.
- Open a signalk-server issue unless the human asked.
