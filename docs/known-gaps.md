# Known gaps

- **Live AIS inject** is not in `npm test`. Unit tests cover NM, message text, bearing format, and resend gating.
- **v1 vs v2:** v1 returns plain strings; v2 returns `{ state, statusCode, message }`. Keep both; do not invent a third API.
- **`plugin.registerWithRouter` is empty.** Routing is registered in `plugin.start`. Do not “fix” that unless a server version requires it.
- **Notification path** uses the buddy urn as a path segment. Odd characters in a urn could be awkward for some clients; not changing that here.
- **Magnetic fallback** is not the same reference as a true great-circle bearing. Prefer `headingTrue` when it exists.
- **COG** is not used as heading.
