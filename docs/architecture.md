# Architecture

## Job

Maintain a configured list of other vessels (buddies). When a buddy's `navigation.position` is received, mark that vessel `buddy: true` and optionally raise `notifications.buddy.<urn>` if they are inside a configured range of self.

## Data flow

```
plugin config (urn, optional name, alert, alertDistance, resendAlerts)
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
              else if we had alerted:
                state=normal  (cleared)
```

HTTP mutations (add / rename / delete) call `app.savePluginOptions`, then tear down and rebuild subscriptions.

## Paths

| Path | Meaning |
|---|---|
| `vessels.<urn>.buddy` | boolean on the buddy context (empty path, value `{ buddy: true/false }`) |
| `notifications.buddy.<urn>` | alert / normal on self |
| config `alertDistance` | number; **origin is km** (`* 1000`). Slice 2 switches this to NM (`* 1852`). |

## HTTP

| API | Base |
|---|---|
| v1 | `/signalk/v1/api/resources/buddies` |
| v2 | `/signalk/v2/api/resources/buddies` (`plugin.getOpenApi`, `plugin.feature = "buddies"`) |

v1 PUT rename still has `props.buddiesfind` (missing `.`). v2 PUT uses `.find`. See known-gaps.

## Stop

`plugin.stop` unsubscribes all position subscriptions.
