'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const directory = require('../lib/directory')

test('identity needs 9-digit MMSI and a name', () => {
  assert.equal(directory.identityFromSelf('244670524', 'WAVE').ok, true)
  assert.equal(directory.identityFromSelf({ value: '244670524' }, { value: 'WAVE' }).mmsi, '244670524')
  assert.equal(directory.identityFromSelf('123', 'WAVE').ok, false)
  assert.equal(directory.identityFromSelf('244670524', '  ').ok, false)
})

test('share days default 90, cap 1–365', () => {
  assert.equal(directory.clampShareDays(undefined), 90)
  assert.equal(directory.clampShareDays(0), 90)
  assert.equal(directory.clampShareDays(90), 90)
  assert.equal(directory.clampShareDays(400), 365)
})

test('renew at half lease and on start', () => {
  const now = 1_000_000
  const half90 = directory.nextRenewAtMs(now, 90)
  assert.equal(half90, now + 45 * directory.DAY_MS)
  assert.equal(directory.shouldAttemptRenew({ share: true, nowMs: now, renewAtMs: null }), true)
  assert.equal(directory.shouldAttemptRenew({ share: true, nowMs: now, renewAtMs: now + 1000 }), false)
  assert.equal(directory.shouldAttemptRenew({ share: true, nowMs: now + 1000, renewAtMs: now }), true)
  assert.equal(directory.shouldAttemptRenew({ share: false, nowMs: now, renewAtMs: null }), false)
})

test('backoff grows then caps at one hour', () => {
  assert.equal(directory.backoffMs(0), 60 * 1000)
  assert.equal(directory.backoffMs(3), 60 * 60 * 1000)
  assert.equal(directory.backoffMs(99), 60 * 60 * 1000)
})

test('POST payload and success/failure', async () => {
  const body = directory.sharePayload({
    mmsi: '244670524',
    name: 'WAVE',
    share: true,
    days: 90,
    discord: '@htool'
  })
  assert.deepEqual(body, {
    mmsi: '244670524',
    name: 'WAVE',
    share: true,
    days: 90,
    discord: 'htool'
  })
  assert.equal(directory.normalizeDiscord('@@bad space'), '')
  const okFetch = async () => ({ ok: true })
  assert.equal(await directory.postShare(okFetch, directory.POST_URL, body), true)
  const badFetch = async () => ({ ok: false, status: 500 })
  await assert.rejects(() => directory.postShare(badFetch, directory.POST_URL, body))
})

test('share queue skips stale unshare when a share follows', async () => {
  const sent = []
  const enqueue = directory.createShareQueue(async item => {
    sent.push(item.share)
  })
  const first = enqueue({ share: false, body: { share: false } })
  const second = enqueue({ share: true, body: { share: true } })
  await first
  await second
  assert.deepEqual(sent, [true])
})

test('share queue still unshares when nothing follows', async () => {
  const sent = []
  const enqueue = directory.createShareQueue(async item => {
    sent.push(item.share)
  })
  await enqueue({ share: false, body: { share: false } })
  assert.deepEqual(sent, [false])
})

test('schema includes skShare and skShareDays', () => {
  const plugin = require('../index.js')({
    debug: () => {},
    getPath: () => {},
    getSelfPath: () => {},
    handleMessage: () => {},
    subscriptionmanager: { subscribe: () => {} },
    setProviderError: () => {},
    savePluginOptions: () => {}
  })
  assert.equal(plugin.schema.properties.skShare.default, false)
  assert.equal(plugin.schema.properties.skShareDays.default, 90)
  assert.equal(plugin.schema.properties.skAlert.default, true)
  assert.equal(plugin.schema.properties.personalHeading.title, 'Personal buddies')
  assert.equal(plugin.schema.properties.signalkHeading.title, 'Signal K buddies')
  assert.equal(
    plugin.schema.properties.signalkHeading.description,
    'Opt-in where boatname and MMSI are shared.'
  )
  assert.equal(plugin.schema.properties.skShare.title, 'Share this vessel')
  assert.equal(plugin.schema.properties.skDiscord.title, 'Discord username')
  assert.equal(plugin.schema.properties.skDiscord.maxLength, 32)
})

test('parseRoster drops expired, bad MMSI, and this vessel', () => {
  const now = Date.parse('2026-09-09T12:00:00Z')
  const rows = directory.parseRoster([
    { mmsi: '244670524', name: 'WAVE', expires_at: '2026-12-08T15:32:00Z' },
    { mmsi: '244750229', name: 'Dankbaarheid', expires_at: '2026-09-08T00:00:00Z' },
    { mmsi: '999000001', name: 'SK test boat', expires_at: '2026-12-08T15:32:00Z', discord: '@tester' },
    { mmsi: '123', name: 'nope' }
  ], now, '244670524')
  assert.deepEqual(rows, [
    { mmsi: '999000001', name: 'SK test boat', expires_at: '2026-12-08T15:32:00Z', discord: 'tester' }
  ])
})

test('directory GET is daily unless never fetched', () => {
  const now = Date.parse('2026-09-09T12:00:00Z')
  assert.equal(directory.shouldRefreshRoster({ nowMs: now, fetchedAtMs: null }), true)
  assert.equal(directory.shouldRefreshRoster({ nowMs: now, fetchedAtMs: 0 }), true)
  assert.equal(directory.shouldRefreshRoster({
    nowMs: now,
    fetchedAtMs: now - 2 * 60 * 60 * 1000,
    intervalMs: directory.DAY_MS
  }), false)
  assert.equal(directory.shouldRefreshRoster({
    nowMs: now,
    fetchedAtMs: now - directory.DAY_MS,
    intervalMs: directory.DAY_MS
  }), true)
})

test('roster status includes count and last successful GET time', () => {
  const fetchedAt = Date.parse('2026-09-09T15:32:19Z')
  assert.equal(directory.formatFetchedAt(0), null)
  assert.equal(directory.formatFetchedAt(fetchedAt), '2026-09-09 15:32:19 UTC')
  assert.equal(
    directory.rosterStatusText({ count: 3, fetchedAtMs: fetchedAt }),
    '3 loaded. Last successful GET 2026-09-09 15:32:19 UTC'
  )
  assert.equal(
    directory.rosterStatusText({ count: 0 }),
    'None loaded. No successful GET yet'
  )
  assert.equal(
    directory.rosterStatusText({ count: 2, fetchedAtMs: fetchedAt, failed: true }),
    '2 loaded from cache. Last successful GET 2026-09-09 15:32:19 UTC. Directory GET failed.'
  )
})

test('match roster to local AIS, exclude self', () => {
  const roster = [
    { mmsi: '244670524', name: 'SELF' },
    { mmsi: '244750229', name: 'Dankbaarheid', discord: 'dirk' },
    { mmsi: '244000000', name: 'not here' }
  ]
  const vessels = ['urn:mrn:imo:mmsi:244670524', 'urn:mrn:imo:mmsi:244750229']
  const matches = directory.matchRosterToVessels(roster, vessels, '244670524')
  assert.deepEqual(matches, [
    { urn: 'urn:mrn:imo:mmsi:244750229', name: 'Dankbaarheid', discord: 'dirk' }
  ])
})

test('stop does not unshare; start with share off does', async () => {
  const posts = []
  const prev = global.fetch
  global.fetch = async (url, opts) => {
    if ( opts && opts.method === 'POST' ) {
      posts.push(JSON.parse(opts.body))
      return { ok: true }
    }
    return { ok: true, json: async () => ({ buddies: [] }) }
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sk-buddy-'))
  const plugin = require('../index.js')({
    debug: () => {},
    getPath: () => ({}),
    getSelfPath: p => (String(p).indexOf('name') >= 0 ? 'Lepelaar' : '244670524'),
    handleMessage: () => {},
    subscriptionmanager: { subscribe: () => {} },
    setProviderError: () => {},
    savePluginOptions: (p, cb) => { if ( cb ) cb() },
    getDataDirPath: () => dir,
    get: () => {},
    post: () => {},
    put: () => {},
    delete: () => {}
  })
  try {
    plugin.start({ skShare: true, skShareDays: 90, buddies: [] })
    await new Promise(r => setTimeout(r, 40))
    assert.ok(posts.some(p => p.share === true))
    posts.length = 0
    plugin.stop()
    await new Promise(r => setTimeout(r, 40))
    assert.equal(posts.length, 0)
    plugin.start({ skShare: false, skShareDays: 90, buddies: [] })
    await new Promise(r => setTimeout(r, 40))
    assert.ok(posts.some(p => p.share === false))
    plugin.stop()
  } finally {
    global.fetch = prev
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
