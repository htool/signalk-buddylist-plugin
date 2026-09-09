# signalk-buddylist-plugin
Provides a buddy list for Signal K Node Server

This plugin will send an alert when a buddy is within a specific distance of your boat.

It also sets `vessels.<urn>.buddy` to true so that clients can indicate buddies on a map.

## Scope

| | |
|---|---|
| Job | Configured buddy list, proximity notifications, `buddy` flag for map clients; optional opt-in Signal K buddy directory |
| In | Plugin config (personal URNs, alert knobs, `skShare`, `skShareDays`, optional `skDiscord`); buddy `navigation.position`; self `navigation.position`; directory GET of MMSIs |
| Out | `vessels.<urn>.buddy` and `notifications.buddy.<urn>` (personal); `signalkBuddy` / `notifications.signalkBuddy` (SK group); HTTP personal list at `/signalk/v1|v2/api/resources/buddies`; POST MMSI+name+optional Discord to vhfinfo.org when share is on |
| Not | NMEA encode; position/GPS/heading/AIS upload; SK roster in the HTTP buddies API or the admin boat list |

**Storage:** Personal list and share settings stay in plugin config on this server. The opted-in SK roster is cached in plugin data dir `sk-roster.json` (MMSI, name, optional Discord, expiry — no positions). The public directory stores the same identity fields with a lease; see [ADR 004](docs/adr/004-signalk-buddies-roster.md#storage).

Agent work: start at [AGENTS.md](AGENTS.md).
