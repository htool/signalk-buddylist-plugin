# Known gaps

- **No tests.** `npm test` is a stub. Threshold and notification text are untested.
- **v1 vs v2:** v1 returns plain strings; v2 returns `{ state, statusCode, message }`. Keep both; do not invent a third API.
- **`plugin.registerWithRouter` is empty.** Routing is registered in `plugin.start`. Do not “fix” that unless a server version requires it.
- **Notification path** uses the buddy urn as a path segment. Odd characters in a urn could be awkward for some clients; not changing that here.
- **Heading in the alert** is slice 3 (`alertBearing`). Until then messages have distance only.
