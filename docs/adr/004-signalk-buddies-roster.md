# ADR 004: Opt-in Signal K buddies (roster + local AIS)

Status: implemented

## Context

Personal buddies are a manual URN list. AIS already carries MMSI, name, and position. The extra product is: opted-in Signal K users can recognise each other when they already appear in `vessels.*`. No extra GPS share. No magic-link.

## Decision

1. **Two groups.** Personal buddies stay as today. Signal K buddies are a second config block with the same alert / distance / bearing / resend knobs (`skAlert`, `skAlertDistance`, `skAlertBearing`, `skResendAlerts`, `skResendAlertDistance`).
2. **Opt-in** is a plugin checkbox (`skShare`). No email. On save/start if on: POST MMSI + name + optional Discord username + `days` to a PHP script on vhfinfo.org. Uncheck (`skShare` off) on start: POST `share: false`. Plugin stop/restart with share still on does not delete. MMSI and name from this server; if either is missing, do not POST and set a provider error.
3. **Lease.** Config **`skShareDays`**, default **90**. POST includes `days`. Server `expires_at = now() + days` (cap 1–365). GET returns only non-expired rows.
4. **Cache.** Plugin data dir `sk-roster.json` (`mmsi`, `name`, `discord`, `expires_at`, last GET). Survives restart. Drop expired rows and this vessel’s MMSI locally. Admin form shows a loaded count and last successful GET time (UTC). Do not put the boat list in the config schema. **Refresh now** (tick + Save). POST `/plugins/signalk-buddylist-plugin/refresh` GETs without waiting a day.
5. **GET cadence.** HTTP GET on plugin start, at most once a day while running, or when Refresh now is set. On GET failure, keep the cache.
6. **Renew like DHCP.** Remember `renew_at` at half the lease. Also try on start if share is on. Success → new expiry and next `renew_at`. Failure → backoff. Uncheck deletes. Restart with share on does not.
7. **Internet.** No path or `app.*` for WAN. App Store probes npm but does not publish that. **Asked upstream:** [signalk-server#3022](https://github.com/SignalK/signalk-server/issues/3022). Meanwhile: directory HTTP success behind `lib/directory.js`. Do not use OpenWrt/Netgear LTE paths.
8. **Nearby** = opted-in MMSI already in `vessels.*` (AIS) and inside `skAlertDistance`. Subscribe the same way as personal buddies.
9. **Do not reuse** `vessels.*.buddy` or `notifications.buddy.*`. Use `signalkBuddy` and `notifications.signalkBuddy.<urn>`.
10. **Deltas only.** Do not encode fake AIS onto N2K.
11. **Directory URL** defaults to `https://vhfinfo.org/sk-buddies.php` (POST) and a public GET of the list. PHP owns SQL (service role on the host, not in the plugin). Anyone can claim an MMSI; accepted for a no-position roster. Optional Discord username is stored so a nearby alert can include `@user` to ping. Rate-limit and validate MMSI shape on the script.

## Storage

Nothing in this feature uploads position, GPS, heading, or AIS tracks.

| Where | What | How |
|---|---|---|
| **Not off-boat** | Position, GPS, heading, AIS | Nearby uses `vessels.*` already on this Signal K server |
| **This server, plugin config** `plugin-config-data/signalk-buddylist-plugin.json` | Personal `buddies[]` (URN + optional name), alert knobs, `skShare`, `skShareDays`, optional `skDiscord` | Signal K plugin options. Do **not** put the SK boat list in the admin schema (Save becomes unreachable with a large roster) |
| **This server, plugin data dir** `plugin-config-data/signalk-buddylist-plugin/sk-roster.json` | Cached directory rows: `mmsi`, `name`, optional `discord`, `expires_at`, last successful GET | Written by the plugin via `app.getDataDirPath()`. Survives restart. This vessel’s MMSI omitted. GET on start, at most once a day, or Refresh now |
| **Directory** `https://vhfinfo.org/sk-buddies.php` → table `sk_buddies` | MMSI, name, optional Discord username, `shared`, `expires_at`, `updated_at` | Plugin POST `{ mmsi, name, share, days, discord }`. Uncheck POSTs `share: false` (delete). Plugin never holds SQL keys; PHP on the host does. Anyone can claim an MMSI |
| **Live Signal K** | Personal `vessels.<urn>.buddy` and `notifications.buddy.<urn>`; SK group `signalkBuddy` / `notifications.signalkBuddy.<urn>` | Deltas via `app.handleMessage`. Not NMEA |
| **HTTP** `/signalk/v1` and `/signalk/v2` `.../api/resources/buddies` | Personal buddy list only | Unchanged; SK roster is not this API |

## Consequences

- vhfinfo.org PHP + table is required for live opt-in; plugin tests mock HTTP.
- Spoofed MMSIs can appear as SK buddies if they are also on AIS.
- When signalk-server exposes internet status, replace the probe in the seam (own slice).
