# Architecture

## Job

Maintain a configured list of other vessels (buddies). When a buddy's `navigation.position` is received, mark that vessel `buddy: true` and optionally raise `notifications.buddy.<urn>` if they are inside a configured range of self.

## Data flow

```
plugin config (urn, optional name, alert…, skShare) + sk-roster.json
        │
        ▼
subscribe vessels.<urn>.navigation.position  (policy: instant)
        │
        ├─► vessels.<urn>.buddy = true   (root path on that context)
        │
        └─► if alert enabled and self position known:
              distance_m = geolib.getDistance(self, buddy)
              if distance_m < threshold:
                notifications.buddy.<urn>  state=alert
                optional: relative bearing vs headingTrue else headingMagnetic
              else if we had alerted:
                state=normal  (cleared)
```

HTTP mutations (add / rename / delete) call `app.savePluginOptions`, then tear down and rebuild subscriptions.

## Paths

| Path | Meaning |
|---|---|
| `vessels.<urn>.buddy` | boolean on the buddy context (empty path, value `{ buddy: true/false }`) |
| `notifications.buddy.<urn>` | alert / normal on self |
| config `alertDistance` | number, nautical miles; threshold is `alertDistance * 1852` metres |
| config `alertBearing` | if true, alert may include relative ° (`headingTrue` else magnetic) |
| config `resendAlerts` | if true, send again while in range |
| config `resendAlertDistance` | metres; ignored unless resend is on. 0 = every position; else `|Δdistance| ≥ X` |
| config `skShare` | opt-in POST of self MMSI + name to vhfinfo directory. Uncheck POSTs `share: false`. Plugin stop/restart with share still on does not delete |
| config `skShareDays` | lease days, default 90; renew at half lease when directory HTTP succeeds |
| config `skDiscord` | optional Discord username; POSTed with share; shown in SK-buddy near/away text |
| plugin data `sk-roster.json` | cached directory `{ mmsi, name, discord?, expires_at }[]` plus last GET; this vessel omitted; not in the admin form |
| config `skRosterStatus` | read-only: loaded count + date/time of last successful HTTP GET (UTC) |
| config `skRosterRefresh` | tick + Save forces a directory GET |
| config `skAlert` … `skResendAlertDistance` | same knobs as personal, for AIS-matched SK roster |
| `vessels.<urn>.signalkBuddy` | SK-group flag; not `buddy` |
| `notifications.signalkBuddy.<urn>` | SK-group near/away |

## Storage

Nothing off-boat except the opt-in directory row (MMSI, name, optional Discord, lease). No GPS.

| Place | Holds |
|---|---|
| Plugin config JSON | Personal buddies, alert knobs, share checkbox, lease days, optional Discord username |
| Plugin data `sk-roster.json` | Cached directory list (no positions); this vessel omitted |
| vhfinfo.org `sk_buddies` | MMSI, name, optional Discord, lease; POST/GET `sk-buddies.php` |
| Live deltas | `buddy` / `notifications.buddy` (personal); `signalkBuddy` / `notifications.signalkBuddy` (SK group) |

HTTP `/signalk/v1|v2/api/resources/buddies` is the personal list only.

## HTTP

| API | Base |
|---|---|
| v1 | `/signalk/v1/api/resources/buddies` |
| v2 | `/signalk/v2/api/resources/buddies` (`plugin.getOpenApi`, `plugin.feature = "buddies"`) |

v1 PUT rename uses `props.buddies.find`. v2 PUT does too.

## Stop

`plugin.stop` unsubscribes all position subscriptions. It does not unshare. Unshare is POST `share: false` on the next start when `skShare` is off.
