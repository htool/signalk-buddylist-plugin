# Known gaps

- **Live AIS inject** is not in `npm test`. Unit tests cover NM, message text, bearing format, and resend gating.
- **v1 vs v2:** v1 returns plain strings; v2 returns `{ state, statusCode, message }`. Keep both; do not invent a third API.
- **`plugin.registerWithRouter` is empty.** Routing is registered in `plugin.start`. Do not “fix” that unless a server version requires it. Same reason CI uses a simple `npm test` workflow instead of Signal K’s reusable `plugin-ci.yml`.
- **Notification path** uses the buddy urn as a path segment. Odd characters in a urn could be awkward for some clients; not changing that here.
- **Magnetic fallback** is not the same reference as a true great-circle bearing. Prefer `headingTrue` when it exists.
- **COG** is not used as heading.
- **Internet up:** No path or `app.*` yet. Opened [signalk-server#3022](https://github.com/SignalK/signalk-server/issues/3022). Workaround: directory HTTP success behind `lib/directory.js`. Check back when that issue is decided. Do not use LTE plugin paths.
- **SK buddies directory** live POST/GET is vhfinfo.org PHP (not in this repo). Plugin tests mock HTTP.
