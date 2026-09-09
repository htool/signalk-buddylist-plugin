# ADR 004: Opt-in Signal K buddies (roster + local AIS)

Status: implemented

## Context

Personal buddies are a manual URN list. AIS already carries MMSI, name, and position. The extra product is: opted-in Signal K users can recognise each other when they already appear in `vessels.*`. No extra GPS share. No magic-link.

## Decision

1. **Two groups.** Personal buddies stay as today. Signal K buddies are a second config block with the same alert / distance / bearing / resend knobs (`skAlert`, `skAlertDistance`, `skAlertBearing`, `skResendAlerts`, `skResendAlertDistance`).
2. **Opt-in** is a plugin checkbox (`skShare`). No email. On save/start if on: POST MMSI + name + `days` to a PHP script on vhfinfo.org. Uncheck or stop: POST `share: false`. MMSI and name from this server; if either is missing, do not POST and set a provider error.
3. **Lease.** Config **`skShareDays`**, default **90**. POST includes `days`. Server `expires_at = now() + days` (cap 1–365). GET returns only non-expired rows.
4. **Renew like DHCP.** Remember `renew_at` at half the lease. Also try on start if share is on. Success → new expiry and next `renew_at`. Failure → backoff. Uncheck deletes.
5. **Internet.** No path or `app.*` for WAN. App Store probes npm but does not publish that. **Asked upstream:** [signalk-server#3022](https://github.com/SignalK/signalk-server/issues/3022). Meanwhile: directory HTTP success behind `lib/directory.js`. Do not use OpenWrt/Netgear LTE paths.
6. **Nearby** = opted-in MMSI already in `vessels.*` (AIS) and inside `skAlertDistance`. Subscribe the same way as personal buddies.
7. **Do not reuse** `vessels.*.buddy` or `notifications.buddy.*`. Use `signalkBuddy` and `notifications.signalkBuddy.<urn>`.
8. **Deltas only.** Do not encode fake AIS onto N2K.
9. **Directory URL** defaults to `https://vhfinfo.org/sk-buddies.php` (POST) and a public GET of the list. PHP owns SQL (service role on the host, not in the plugin). Anyone can claim an MMSI; accepted for a no-position roster. Rate-limit and validate MMSI shape on the script.

## Consequences

- vhfinfo.org PHP + table is required for live opt-in; plugin tests mock HTTP.
- Spoofed MMSIs can appear as SK buddies if they are also on AIS.
- When signalk-server exposes internet status, replace the probe in the seam (own slice).
