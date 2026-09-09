# signalk-buddylist-plugin
Provides a buddy list for Signal K Node Server

This plugin will send an alert when a buddy is within a specific distance of your boat.

It also sets `vessels.<urn>.buddy` to true so that clients can indicate buddies on a map.

## Scope

| | |
|---|---|
| Job | Configured buddy list, proximity notifications, `buddy` flag for map clients |
| In | Plugin config (`urn`, optional name, `alert`, `alertDistance`, `resendAlerts`); buddy `navigation.position`; self `navigation.position` |
| Out | `vessels.<urn>.buddy`; `notifications.buddy.<urn>`; HTTP at `/signalk/v1/api/resources/buddies` and `/signalk/v2/api/resources/buddies` |
| Not | NMEA encode, tests (yet), heading in the alert |

Agent work: start at [AGENTS.md](AGENTS.md).
