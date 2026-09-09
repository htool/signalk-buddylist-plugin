# Known gaps

- **Live AIS inject** is not in `npm test`. Unit tests cover NM, message text, bearing format, and resend gating.
- **v1 vs v2:** v1 returns plain strings; v2 returns `{ state, statusCode, message }`. Keep both; do not invent a third API.
- **`plugin.registerWithRouter` is empty.** Routing is registered in `plugin.start`. Do not “fix” that unless a server version requires it. Same reason CI uses a simple `npm test` workflow instead of Signal K’s reusable `plugin-ci.yml`.
- **Notification path** uses the buddy urn as a path segment. Odd characters in a urn could be awkward for some clients; not changing that here.
- **Magnetic fallback** is not the same reference as a true great-circle bearing. Prefer `headingTrue` when it exists.
- **COG** is not used as heading.
- **Internet up:** Signal K has no path or `app.*` for WAN. App Store already probes npm (`storeAvailable` / npmjs catch) but does not expose that to plugins. **Pending decision:** should `signalk-server` publish that (see ADR 004). Workaround: directory HTTP success behind one `lib/` function. Check back when the human says the server grew the API. Do not use LTE plugin paths.
- **SK buddies directory** live POST/GET is vhfinfo.org PHP (not in this repo). Plugin tests mock HTTP.
